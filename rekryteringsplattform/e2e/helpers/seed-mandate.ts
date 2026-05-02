import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _sb: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (_sb) return _sb;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  _sb = createClient(url, key, { auth: { persistSession: false } });
  return _sb;
}

const E2E_SEEDED_PREFIX = "E2E-";

/**
 * Look up the recruiters.id for the E2E recruiter account.
 * Requires E2E_RECRUITER_EMAIL to be set and setup-test-recruiter to have run.
 */
async function findE2ERecruiterId(): Promise<string> {
  const email = process.env.E2E_RECRUITER_EMAIL;
  if (!email) throw new Error("Missing E2E_RECRUITER_EMAIL");

  const sb = admin();
  // profiles.email is populated by the auth.users trigger.
  const { data: profile, error: pErr } = await sb
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();
  if (pErr || !profile) throw new Error(`Profile not found for ${email}: ${pErr?.message}`);

  const { data: rec, error: rErr } = await sb
    .from("recruiters")
    .select("id")
    .eq("user_id", profile.id)
    .single();
  if (rErr || !rec) throw new Error(`Recruiter row not found for ${email} — run test:smoke:setup first`);
  return rec.id;
}

/**
 * Insert a job_mandate row for the given job_id using the E2E recruiter.
 * Returns the mandate UUID (used as the public apply URL segment).
 */
export async function seedMandate(jobId: string): Promise<string> {
  const recruiterId = await findE2ERecruiterId();
  const sb = admin();
  const { data, error } = await sb
    .from("job_mandates")
    .insert({ job_id: jobId, recruiter_id: recruiterId })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Mandate seed failed: ${error?.message}`);
  return data.id;
}

/**
 * Delete all job_mandates linked to E2E-prefixed jobs.
 * Cascade-on-delete from jobs would handle this too, but explicit cleanup
 * is safer when seedJob and deleteSeededJobs are called in a different order.
 */
export async function deleteSeededMandates(): Promise<void> {
  const sb = admin();
  const { data: jobs } = await sb
    .from("jobs")
    .select("id")
    .like("title", `${E2E_SEEDED_PREFIX}%`);
  if (!jobs?.length) return;
  const jobIds = jobs.map((j) => j.id);
  await sb.from("job_mandates").delete().in("job_id", jobIds);
}
