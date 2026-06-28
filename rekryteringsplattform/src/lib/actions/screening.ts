"use server";

import { randomUUID, createHash } from "crypto";
import { authorizeMandate, gatherEvalData } from "@/lib/screening/eval-data";
import {
  fillEvaluationPrompt,
  assembleClipboardPayload,
  type EvalConfig,
} from "@/lib/screening/evaluation-prompt";

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

/**
 * Phase 1 — build the assembled evaluation prompt for one candidate (manual
 * copy/paste). Returns the clipboard payload + a signed CV download URL.
 */
export async function buildEvaluationPrompt(
  candidateId: string,
  mandateId: string
): Promise<{ payload: string; cvUrl: string | null } | { error: string }> {
  const auth = await authorizeMandate(mandateId);
  if ("error" in auth) return { error: auth.error };

  const data = await gatherEvalData(auth.admin, mandateId, candidateId);
  if ("error" in data) return { error: data.error };

  const cvHash = data.cvPath
    ? `manual:${createHash("sha256").update(data.cvPath).digest("hex").slice(0, 16)}`
    : "(no CV on file)";

  const prompt = fillEvaluationPrompt({
    jdText: data.jdText,
    config: data.config,
    metadata: {
      screeningId: randomUUID(),
      modelVersion: "external (manual run)",
      isoTimestamp: new Date().toISOString(),
      jdId: data.jobId,
      cvHash,
    },
  });

  const payload = assembleClipboardPayload({
    prompt,
    cvText: null, // recruiter attaches the CV file in their AI tool
    screeningAnswers: data.screeningAnswers,
  });

  let cvUrl: string | null = null;
  if (data.cvPath) {
    const { data: signed } = await auth.admin.storage.from("cvs").createSignedUrl(data.cvPath, 3600);
    cvUrl = signed?.signedUrl ?? null;
  }

  return { payload, cvUrl };
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
