"use server";

import { authorizeMandate } from "@/lib/screening/eval-data";
import { type EvalConfig } from "@/lib/screening/evaluation-prompt";

/** Persist the per-mandate evaluation config (target sector, adjacent, etc.). */
export async function saveMandateEvalConfig(
  mandateId: string,
  config: EvalConfig
): Promise<{ success: true } | { error: string }> {
  const auth = await authorizeMandate(mandateId);
  if ("error" in auth) return { error: auth.error };

  const clean = (arr: string[] | null) =>
    Array.isArray(arr) ? arr.map((s) => s.trim()).filter(Boolean) : [];

  const { error } = await auth.admin
    .from("job_mandates")
    .update({
      eval_target_sector: config.targetSector?.trim() || null,
      eval_adjacent_sectors: clean(config.adjacentSectors),
      eval_transferable_skills: clean(config.transferableSkills),
      eval_custom_keywords: clean(config.customKeywords),
    })
    .eq("id", mandateId);

  if (error) {
    console.error("[screening] saveMandateEvalConfig", error);
    return { error: "Could not save evaluation settings" };
  }
  return { success: true };
}

/** Read the per-mandate evaluation config for prefilling the panel. */
export async function getMandateEvalConfig(
  mandateId: string
): Promise<EvalConfig | null> {
  const auth = await authorizeMandate(mandateId);
  if ("error" in auth) return null;

  const { data } = await auth.admin
    .from("job_mandates")
    .select("eval_target_sector, eval_adjacent_sectors, eval_transferable_skills, eval_custom_keywords")
    .eq("id", mandateId)
    .single();

  if (!data) return null;
  const d = data as any;
  return {
    targetSector: d.eval_target_sector ?? null,
    adjacentSectors: d.eval_adjacent_sectors ?? null,
    transferableSkills: d.eval_transferable_skills ?? null,
    customKeywords: d.eval_custom_keywords ?? null,
  };
}

export type StoredEvaluation = {
  reportMarkdown: string;
  modelVersion: string;
  createdAt: string;
};

/** Phase 2 — fetch the most recent stored evaluation report for display. */
export async function getLatestEvaluation(
  candidateId: string,
  mandateId: string
): Promise<StoredEvaluation | null> {
  const auth = await authorizeMandate(mandateId);
  if ("error" in auth) return null;

  // Scope the report by candidate, NOT by the passed mandateId: a candidate has
  // exactly one mandate, so the newest row IS the report — and reading by
  // candidate_id surfaces it even when a caller computed the mandate key
  // differently (the recruiter page keys on the route param, not the candidate's
  // own mandate_id). IDOR: this is a client-callable server action, so a non-admin
  // caller must own the candidate; otherwise dropping the mandate row-filter would
  // let a recruiter read any report by pairing it with a mandate they own.
  if (!auth.isAdmin) {
    const { data: recruiter } = await auth.admin
      .from("recruiters").select("id").eq("user_id", auth.userId).single();
    const { data: cand } = await auth.admin
      .from("candidates").select("recruiter_id").eq("id", candidateId).maybeSingle();
    if (!recruiter || !cand || (cand as any).recruiter_id !== (recruiter as any).id) return null;
  }

  const { data } = await auth.admin
    .from("candidate_screenings")
    .select("report_markdown, model_version, created_at")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const d = data as any;
  return {
    reportMarkdown: d.report_markdown,
    modelVersion: d.model_version,
    createdAt: d.created_at,
  };
}
