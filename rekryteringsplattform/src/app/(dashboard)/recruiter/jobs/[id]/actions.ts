"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function claimMandate(jobId: string) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Du måste vara inloggad" };
  }

  // Get recruiter profile and check approval status
  const { data: recruiter, error: recruiterError } = await supabase
    .from("recruiters")
    .select("id, approval_status")
    .eq("user_id", user.id)
    .single();

  if (recruiterError || !recruiter) {
    return { error: "Rekryterarprofil hittades inte" };
  }

  if (recruiter.approval_status !== "approved") {
    return { error: "Din profil måste vara godkänd för att ta uppdrag" };
  }

  // Check max 5 active mandates
  const { count: activeMandateCount, error: countError } = await supabase
    .from("job_mandates")
    .select("*", { count: "exact", head: true })
    .eq("recruiter_id", recruiter.id)
    .eq("is_active", true);

  if (countError) {
    return { error: "Kunde inte kontrollera aktiva uppdrag" };
  }

  if ((activeMandateCount ?? 0) >= 5) {
    return { error: "Du kan ha max 5 aktiva uppdrag samtidigt" };
  }

  // Check that the job exists, is active, and has available slots
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, max_recruiters, current_recruiter_count, status")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return { error: "Jobbet hittades inte" };
  }

  if (job.status !== "active") {
    return { error: "Jobbet är inte aktivt" };
  }

  if (job.current_recruiter_count >= job.max_recruiters) {
    return { error: "Alla platser för rekryterare är fyllda" };
  }

  // Check no existing active mandate for this recruiter on this job
  const { data: existingMandate } = await supabase
    .from("job_mandates")
    .select("id")
    .eq("job_id", jobId)
    .eq("recruiter_id", recruiter.id)
    .eq("is_active", true)
    .maybeSingle();

  if (existingMandate) {
    return { error: "Du har redan ett aktivt uppdrag för detta jobb" };
  }

  // Insert new mandate
  const { error: insertError } = await supabase.from("job_mandates").insert({
    job_id: jobId,
    recruiter_id: recruiter.id,
    is_active: true,
  });

  if (insertError) {
    return { error: "Kunde inte ta uppdraget. Försök igen." };
  }

  // Increment current_recruiter_count on the job
  const { error: updateError } = await supabase
    .from("jobs")
    .update({
      current_recruiter_count: job.current_recruiter_count + 1,
    })
    .eq("id", jobId);

  if (updateError) {
    return { error: "Uppdraget skapades men kunde inte uppdatera jobbräknaren" };
  }

  revalidatePath(`/recruiter/jobs/${jobId}`);
  revalidatePath("/recruiter/jobs");
  revalidatePath("/recruiter/mandates");

  return { success: true };
}

export async function releaseMandate(jobId: string) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Du måste vara inloggad" };
  }

  // Get recruiter profile
  const { data: recruiter, error: recruiterError } = await supabase
    .from("recruiters")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (recruiterError || !recruiter) {
    return { error: "Rekryterarprofil hittades inte" };
  }

  // Find the active mandate
  const { data: mandate, error: mandateError } = await supabase
    .from("job_mandates")
    .select("id")
    .eq("job_id", jobId)
    .eq("recruiter_id", recruiter.id)
    .eq("is_active", true)
    .single();

  if (mandateError || !mandate) {
    return { error: "Inget aktivt uppdrag hittades för detta jobb" };
  }

  // Deactivate the mandate
  const { error: updateError } = await supabase
    .from("job_mandates")
    .update({
      is_active: false,
      released_at: new Date().toISOString(),
    })
    .eq("id", mandate.id);

  if (updateError) {
    return { error: "Kunde inte släppa uppdraget. Försök igen." };
  }

  // Decrement current_recruiter_count on the job
  const { data: job } = await supabase
    .from("jobs")
    .select("current_recruiter_count")
    .eq("id", jobId)
    .single();

  if (job) {
    await supabase
      .from("jobs")
      .update({
        current_recruiter_count: Math.max(0, job.current_recruiter_count - 1),
      })
      .eq("id", jobId);
  }

  revalidatePath(`/recruiter/jobs/${jobId}`);
  revalidatePath("/recruiter/jobs");
  revalidatePath("/recruiter/mandates");

  return { success: true };
}
