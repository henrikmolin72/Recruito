"use server";

import { authorizeMandate } from "@/lib/screening/eval-data";

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
