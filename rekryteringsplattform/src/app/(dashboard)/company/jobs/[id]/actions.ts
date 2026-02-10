"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { canTransitionCandidate } from "@/lib/validations/candidate-transitions";
import { canTransition } from "@/lib/validations/job-transitions";
import {
  PLATFORM_COMMISSION_PERCENTAGE,
  RECRUITER_COMMISSION_PERCENTAGE,
  GUARANTEE_PERIOD_DAYS,
} from "@/types/enums";

export async function updateCandidateStatus(
  candidateId: string,
  newStatus: string
) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Du måste vara inloggad" };
  }

  // Get the candidate with current status
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select("id, status, job_id")
    .eq("id", candidateId)
    .single();

  if (candidateError || !candidate) {
    return { error: "Kandidaten hittades inte" };
  }

  // Validate the transition
  if (!canTransitionCandidate(candidate.status, newStatus)) {
    return {
      error: `Kan inte ändra status från "${candidate.status}" till "${newStatus}"`,
    };
  }

  // Build the update object with timestamp for the new status
  const updateData: Record<string, string> = {
    status: newStatus,
    status_changed_at: new Date().toISOString(),
  };

  // Set specific timestamp fields based on the new status
  if (newStatus === "reviewing") {
    updateData.reviewed_at = new Date().toISOString();
  } else if (newStatus === "interview") {
    updateData.interview_at = new Date().toISOString();
  } else if (newStatus === "offered") {
    updateData.offered_at = new Date().toISOString();
  } else if (newStatus === "hired") {
    updateData.hired_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("candidates")
    .update(updateData)
    .eq("id", candidateId);

  if (updateError) {
    return { error: "Kunde inte uppdatera kandidatstatus" };
  }

  revalidatePath(`/company/jobs/${candidate.job_id}`);
  revalidatePath(`/company/candidates/${candidateId}`);

  return { success: true };
}

export async function hireCandidate(
  candidateId: string,
  data: { annual_salary: number; start_date: string }
) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Du måste vara inloggad" };
  }

  // Get the candidate with job details
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select("id, status, job_id, recruiter_id")
    .eq("id", candidateId)
    .single();

  if (candidateError || !candidate) {
    return { error: "Kandidaten hittades inte" };
  }

  // Validate transition to hired
  if (!canTransitionCandidate(candidate.status, "hired")) {
    return {
      error: `Kan inte anställa kandidat med status "${candidate.status}"`,
    };
  }

  // Get the job to calculate fees
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, company_id, fee_percentage, status")
    .eq("id", candidate.job_id)
    .single();

  if (jobError || !job) {
    return { error: "Jobbet hittades inte" };
  }

  // Calculate fees
  const totalFee = Math.round(data.annual_salary * (job.fee_percentage / 100));
  const platformFee = Math.round(
    totalFee * (PLATFORM_COMMISSION_PERCENTAGE / 100)
  );
  const recruiterFee = Math.round(
    totalFee * (RECRUITER_COMMISSION_PERCENTAGE / 100)
  );

  // Calculate guarantee end date
  const startDate = new Date(data.start_date);
  const guaranteeEndDate = new Date(startDate);
  guaranteeEndDate.setDate(guaranteeEndDate.getDate() + GUARANTEE_PERIOD_DAYS);

  // Create placement record
  const { error: placementError } = await supabase
    .from("placements")
    .insert({
      candidate_id: candidateId,
      job_id: candidate.job_id,
      company_id: job.company_id,
      recruiter_id: candidate.recruiter_id,
      annual_salary: data.annual_salary,
      fee_percentage: job.fee_percentage,
      total_fee: totalFee,
      platform_fee: platformFee,
      recruiter_fee: recruiterFee,
      status: "confirmed",
      start_date: data.start_date,
      guarantee_end_date: guaranteeEndDate.toISOString().split("T")[0],
    });

  if (placementError) {
    return { error: "Kunde inte skapa placeringspost" };
  }

  // Update candidate status to hired
  const { error: candidateUpdateError } = await supabase
    .from("candidates")
    .update({
      status: "hired",
      status_changed_at: new Date().toISOString(),
      hired_at: new Date().toISOString(),
    })
    .eq("id", candidateId);

  if (candidateUpdateError) {
    return { error: "Kunde inte uppdatera kandidatstatus till anställd" };
  }

  // Update job status to filled
  const { error: jobUpdateError } = await supabase
    .from("jobs")
    .update({
      status: "filled",
      filled_at: new Date().toISOString(),
    })
    .eq("id", candidate.job_id);

  if (jobUpdateError) {
    return { error: "Kunde inte uppdatera jobbstatus till tillsatt" };
  }

  revalidatePath(`/company/jobs/${candidate.job_id}`);
  revalidatePath(`/company/candidates/${candidateId}`);
  revalidatePath("/company/jobs");
  revalidatePath("/company");

  return { success: true };
}

export async function updateJobStatus(jobId: string, newStatus: string) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Du måste vara inloggad" };
  }

  // Get the job with current status
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, status, company_id")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return { error: "Jobbet hittades inte" };
  }

  // Verify the user owns this job through the company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", job.company_id)
    .single();

  if (!company) {
    return { error: "Du har inte behörighet att ändra detta jobb" };
  }

  // Validate the transition
  if (!canTransition(job.status, newStatus)) {
    return {
      error: `Kan inte ändra jobbstatus från "${job.status}" till "${newStatus}"`,
    };
  }

  // Build the update object with relevant timestamps
  const updateData: Record<string, string> = {
    status: newStatus,
  };

  if (newStatus === "active" && !job.status) {
    updateData.published_at = new Date().toISOString();
  }

  if (newStatus === "filled") {
    updateData.filled_at = new Date().toISOString();
  }

  if (newStatus === "closed" || newStatus === "cancelled") {
    updateData.closed_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("jobs")
    .update(updateData)
    .eq("id", jobId);

  if (updateError) {
    return { error: "Kunde inte uppdatera jobbstatus" };
  }

  revalidatePath(`/company/jobs/${jobId}`);
  revalidatePath("/company/jobs");
  revalidatePath("/company");

  return { success: true };
}
