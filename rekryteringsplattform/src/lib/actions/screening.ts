"use server";

import { authorizeMandate } from "@/lib/screening/eval-data";
import { stripClientVisibleScores } from "@/lib/screening/extract-match-score";
import { getClientMatchLevel } from "@/lib/screening/match-level";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

/**
 * Company-authorized fetch of a candidate's full AI screening report.
 *
 * The full report is a CLIENT-ONLY decision-support tool (client request
 * 2026-07-02) — recruiters never see it. Authorization mirrors the company
 * candidate detail page exactly: the caller must own the job the candidate
 * belongs to, and the candidate must be Recruito-screened (companies only ever
 * see screened candidates). candidate_screenings is service-role-only, so the
 * row is read via the admin client only after ownership passes.
 */
export async function getCompanyCandidateScreening(
  candidateId: string
): Promise<StoredEvaluation | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Resolve the candidate's job + screened gate, then confirm the caller owns
  // the job's company — same ownership rule the company page enforces.
  const { data: cand } = await supabase
    .from("candidates")
    .select("job_id, recruito_screened_at, ai_match_score, job:jobs(company:companies(user_id))")
    .eq("id", candidateId)
    .maybeSingle();

  if (!cand) return null;
  const c = cand as any;
  if (!c.recruito_screened_at) return null;

  // Tier gate (client request 2026-07-02): the client never sees the AI report for
  // a below-threshold ("Not Recommended", <75) or not-yet-scored candidate — same
  // boundary as the header badge. Recruiter/admin use getLatestEvaluation and are
  // unaffected.
  if (getClientMatchLevel(c.ai_match_score) === null) return null;

  const jobData = Array.isArray(c.job) ? c.job[0] : c.job;
  const companyData = jobData?.company;
  const jobOwnerId = Array.isArray(companyData) ? companyData[0]?.user_id : companyData?.user_id;
  if (jobOwnerId !== user.id) return null;

  const { data, error } = await createAdminClient()
    .from("candidate_screenings")
    .select("report_markdown, client_report_markdown, model_version, created_at")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getCompanyCandidateScreening: screening fetch failed", error);
    return null;
  }
  if (!data) return null;
  const d = data as any;
  return {
    // Preferred: the dedicated client-facing report (own prompt, no scores —
    // client request 2026-07-11). Legacy rows / failed generation fall back to
    // the internal report. stripClientVisibleScores stays on BOTH as the
    // no-raw-percentages guarantee (a no-op on a well-formed client report);
    // recruiter/admin views use getLatestEvaluation and keep the full report.
    reportMarkdown: stripClientVisibleScores(d.client_report_markdown ?? d.report_markdown),
    modelVersion: d.model_version,
    createdAt: d.created_at,
  };
}
