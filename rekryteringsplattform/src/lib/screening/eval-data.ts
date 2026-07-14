// Shared server-only helpers for candidate evaluation: mandate authorization
// and assembling the JD + candidate context. Imported by the screening server
// actions (Phase 1, copy-to-clipboard) and the /api/screening-report route
// (Phase 2, server-side eval). Plain module (no "use server") so non-action
// callers like route handlers can use it directly.

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/is-admin";
import { stripHtml } from "@/lib/sanitize";
import type { EvalConfig } from "./evaluation-prompt";

type AdminClient = ReturnType<typeof createAdminClient>;

export type AuthResult =
  | { error: string }
  | { admin: AdminClient; userId: string; isAdmin: boolean };

/**
 * Confirm the current user is a recruiter (or admin) who owns the given
 * mandate (recruiter/admin role + mandate-ownership IDOR check).
 */
export async function authorizeMandate(mandateId: string): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  // Admins are authorized via the canonical app_metadata.role (what requireAdmin and
  // the admin route surface trust); profiles.role is OR'd in for resilience. Checking
  // profiles.role alone wrongly denied admins whose profiles.role had drifted.
  const isAdmin = isAdminUser(user, profile);
  if (!isAdmin && profile?.role !== "recruiter") {
    return { error: "Recruiter profile required" };
  }

  let mandateQuery = admin.from("job_mandates").select("id, recruiter_id").eq("id", mandateId);
  if (!isAdmin) {
    const { data: recruiter } = await admin
      .from("recruiters")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!recruiter) return { error: "Recruiter profile required" };
    mandateQuery = mandateQuery.eq("recruiter_id", recruiter.id as string);
  }

  const { data: mandate } = await mandateQuery.single();
  if (!mandate) return { error: "Mandate not found" };

  return { admin, userId: user.id, isAdmin };
}

export type EvalData = {
  jobId: string;
  jdText: string;
  config: EvalConfig;
  cvPath: string | null;
  declaredEmploymentStatus: string | null;
  declaredYearsExperience: number | null;
};

/**
 * Assemble the role JD (title + description + requirements + key points), the
 * per-mandate scoring config and the candidate's CV path. Screening answers are
 * deliberately NOT gathered (client req 2026-07-08): recruiters fill them in
 * after the pre-submission screening runs, so the eval is CV-vs-JD only.
 * Enforces that the candidate actually belongs to the mandate's job (IDOR).
 */
export async function gatherEvalData(
  admin: AdminClient,
  mandateId: string,
  candidateId: string
): Promise<EvalData | { error: string }> {
  const { data: mandate } = await admin
    .from("job_mandates")
    .select(
      "job_id, eval_target_sector, eval_adjacent_sectors, eval_transferable_skills, eval_custom_keywords, " +
      "jobs(id, title, description, requirements, key_requirements)"
    )
    .eq("id", mandateId)
    .single();
  if (!mandate) return { error: "Mandate not found" };

  const m = mandate as any;
  const job = Array.isArray(m.jobs) ? m.jobs[0] : m.jobs;
  if (!job) return { error: "Job not found" };

  const { data: candidate } = await admin
    .from("candidates")
    .select("id, job_id, cv_file_path, employment_status, years_experience")
    .eq("id", candidateId)
    .single();
  if (!candidate) return { error: "Candidate not found" };
  const c = candidate as any;
  if (c.job_id !== job.id) return { error: "Candidate not found" };

  const keyPoints: string[] = Array.isArray(job.key_requirements) ? job.key_requirements : [];
  const jdText = [
    job.title && `Title: ${job.title}`,
    job.description && stripHtml(job.description),
    job.requirements && `Requirements:\n${job.requirements}`,
    keyPoints.length > 0 && `Key Points:\n- ${keyPoints.join("\n- ")}`,
  ].filter(Boolean).join("\n\n");

  if (!jdText.trim()) return { error: "Job is missing a description" };

  return {
    jobId: job.id,
    jdText,
    config: {
      targetSector: m.eval_target_sector ?? null,
      adjacentSectors: m.eval_adjacent_sectors ?? null,
      transferableSkills: m.eval_transferable_skills ?? null,
      customKeywords: m.eval_custom_keywords ?? null,
    },
    cvPath: c.cv_file_path ?? null,
    declaredEmploymentStatus: (c.employment_status as string | null) ?? null,
    declaredYearsExperience: (c.years_experience as number | null) ?? null,
  };
}
