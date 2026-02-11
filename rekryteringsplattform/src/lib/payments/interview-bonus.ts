"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const BONUS_AMOUNTS = {
  first_interview: 50, // EUR
  final_interview: 100, // EUR
} as const;

export async function createInterviewBonus(
  candidateId: string,
  jobId: string,
  recruiterId: string,
  bonusType: "first_interview" | "final_interview"
) {
  const supabase = await createClient();

  const amount = BONUS_AMOUNTS[bonusType];

  const { error } = await supabase.from("interview_bonuses").insert({
    candidate_id: candidateId,
    job_id: jobId,
    recruiter_id: recruiterId,
    bonus_type: bonusType,
    amount_eur: amount,
    status: "pending",
  });

  // Ignore unique constraint violations (bonus already exists)
  if (error && !error.message.includes("duplicate")) {
    return { error: "Kunde inte skapa intervjubonus" };
  }

  revalidatePath("/admin/placements");
  return { success: true, amount };
}

export async function approveBonus(bonusId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("interview_bonuses")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", bonusId);
  if (error) return { error: "Kunde inte godkänna bonus" };
  revalidatePath("/admin/bonuses");
  return { success: true };
}

export async function markBonusPaid(bonusId: string, bankReference: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("interview_bonuses")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      bank_reference: bankReference,
    })
    .eq("id", bonusId);
  if (error) return { error: "Kunde inte markera bonus som betald" };
  revalidatePath("/admin/bonuses");
  return { success: true };
}

export async function getRecruiterBonuses(recruiterId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interview_bonuses")
    .select("*, candidates(first_name, last_name), jobs(title)")
    .eq("recruiter_id", recruiterId)
    .order("created_at", { ascending: false });
  return data || [];
}
