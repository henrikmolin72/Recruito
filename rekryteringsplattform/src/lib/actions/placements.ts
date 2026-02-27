"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Creates a placement record when a candidate is hired / invoice_enabled.
 * Called automatically from the candidate status update flow.
 */
export async function createPlacement(candidateId: string, jobId: string) {
  const supabaseAdmin = createAdminClient();

  // Check if placement already exists for this candidate
  const { data: existing } = await supabaseAdmin
    .from("placements")
    .select("id")
    .eq("candidate_id", candidateId)
    .single();

  if (existing) {
    // Placement already created, skip
    return { success: true, placementId: existing.id };
  }

  // Fetch candidate with job and recruiter details
  const { data: candidate, error: candidateError } = await supabaseAdmin
    .from("candidates")
    .select(
      `
      id,
      job_id,
      recruiter_id,
      expected_salary,
      first_name,
      last_name
    `
    )
    .eq("id", candidateId)
    .single();

  if (candidateError || !candidate) {
    console.error("Candidate not found for placement:", candidateError);
    return { error: "Candidate not found" };
  }

  // Fetch job details for fee calculation
  const { data: job, error: jobError } = await supabaseAdmin
    .from("jobs")
    .select("id, company_id, fee_percentage, salary_min, salary_max, salary_currency, title")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    console.error("Job not found for placement:", jobError);
    return { error: "Job not found" };
  }

  // Determine annual salary: use candidate's expected salary, fall back to job salary midpoint
  const annualSalary =
    candidate.expected_salary ||
    (job.salary_min && job.salary_max
      ? Math.round((job.salary_min + job.salary_max) / 2)
      : job.salary_min || job.salary_max || 0);

  if (annualSalary <= 0) {
    return { error: "Cannot calculate fee: no salary information available" };
  }

  // Calculate fees
  const feePercentage = job.fee_percentage || 15;
  const totalFee = Math.round(annualSalary * (feePercentage / 100));
  const platformFee = Math.round(totalFee * 0.25); // 25% platform
  const recruiterFee = totalFee - platformFee; // 75% recruiter

  const startDate = new Date();
  const guaranteeEndDate = new Date();
  guaranteeEndDate.setDate(guaranteeEndDate.getDate() + 90);

  const { data: placement, error: insertError } = await supabaseAdmin
    .from("placements")
    .insert({
      candidate_id: candidateId,
      job_id: jobId,
      company_id: job.company_id,
      recruiter_id: candidate.recruiter_id,
      annual_salary: annualSalary,
      salary_currency: job.salary_currency || "SEK",
      fee_percentage: feePercentage,
      total_fee: totalFee,
      platform_fee: platformFee,
      recruiter_fee: recruiterFee,
      status: "confirmed",
      start_date: startDate.toISOString().split("T")[0],
      guarantee_end_date: guaranteeEndDate.toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Error creating placement:", insertError);
    return { error: insertError.message };
  }

  // Notify company that a placement is ready for payment
  const { data: companyData } = await supabaseAdmin
    .from("companies")
    .select("user_id")
    .eq("id", job.company_id)
    .single();

  if (companyData) {
    await supabaseAdmin.from("notifications").insert({
      user_id: companyData.user_id,
      title: "Placering bekräftad!",
      body: `${candidate.first_name} ${candidate.last_name} har anställts för "${job.title}". Gå till fakturering för att slutföra betalningen.`,
      link: "/company/billing",
    });
  }

  // Notify recruiter
  const { data: recruiterData } = await supabaseAdmin
    .from("recruiters")
    .select("user_id")
    .eq("id", candidate.recruiter_id)
    .single();

  if (recruiterData) {
    await supabaseAdmin.from("notifications").insert({
      user_id: recruiterData.user_id,
      title: "Placering registrerad!",
      body: `${candidate.first_name} ${candidate.last_name} har placerats för "${job.title}". Betalning inväntas från företaget.`,
      link: "/recruiter/earnings",
    });
  }

  revalidatePath("/company/billing");
  revalidatePath("/recruiter/earnings");
  revalidatePath("/admin/placements");

  return { success: true, placementId: placement.id };
}
