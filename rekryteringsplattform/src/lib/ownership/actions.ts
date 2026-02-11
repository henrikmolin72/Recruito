"use server";

import { createClient } from "@/lib/supabase/server";

// Create ownership record when a recruiter submits a candidate
export async function createOwnership(
  candidateId: string,
  recruiterId: string,
  companyId: string,
  jobId: string,
  candidateName: string,
  candidateEmail: string | null
) {
  const supabase = await createClient();

  // Check if ownership already exists for this recruiter + candidate email at this company
  if (candidateEmail) {
    const { data: existing } = await supabase
      .from("candidate_ownership")
      .select("id")
      .eq("recruiter_id", recruiterId)
      .eq("candidate_email", candidateEmail)
      .eq("company_id", companyId)
      .eq("status", "active")
      .maybeSingle();

    if (existing) return { success: true, existing: true };
  }

  const { error } = await supabase.from("candidate_ownership").insert({
    candidate_id: candidateId,
    recruiter_id: recruiterId,
    company_id: companyId,
    job_id: jobId,
    candidate_name: candidateName,
    candidate_email: candidateEmail,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, existing: false };
}

// Check if a candidate is owned by any recruiter at a company
export async function checkOwnership(
  candidateEmail: string,
  companyId: string
) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("candidate_ownership")
    .select("*, recruiters(user_id), candidates(first_name, last_name)")
    .eq("candidate_email", candidateEmail)
    .eq("company_id", companyId)
    .eq("status", "active")
    .gte("ownership_end", new Date().toISOString());

  return data ?? [];
}

// Get all ownership records for a recruiter
export async function getRecruiterOwnership(recruiterId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("candidate_ownership")
    .select("*, companies(company_name), jobs(title)")
    .eq("recruiter_id", recruiterId)
    .order("ownership_end", { ascending: false });

  return data ?? [];
}

// Get all active ownership records for admin view
export async function getAllOwnership() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("candidate_ownership")
    .select("*, recruiters(user_id), companies(company_name), jobs(title)")
    .order("created_at", { ascending: false });

  return data ?? [];
}

// Claim ownership (when a candidate is hired at a company within ownership period)
export async function claimOwnership(
  ownershipId: string,
  placementId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("candidate_ownership")
    .update({ status: "claimed", claimed_placement_id: placementId })
    .eq("id", ownershipId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
