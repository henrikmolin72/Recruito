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

/** recruiters.id for the E2E recruiter account (same resolution as seed-mandate). */
async function findE2ERecruiterId(): Promise<string> {
  const email = process.env.E2E_RECRUITER_EMAIL;
  if (!email) throw new Error("Missing E2E_RECRUITER_EMAIL — run `npm run test:smoke:setup` first");
  const sb = admin();
  const { data: profile, error: pErr } = await sb.from("profiles").select("id").eq("email", email).single();
  if (pErr || !profile) throw new Error(`Profile not found for ${email}: ${pErr?.message}`);
  const { data: rec, error: rErr } = await sb.from("recruiters").select("id").eq("user_id", profile.id).single();
  if (rErr || !rec) throw new Error(`Recruiter row not found for ${email} — run \`npm run test:smoke:setup\` first`);
  return rec.id;
}

/**
 * Seed a candidate the E2E company can open and message: linked to the given
 * (E2E-prefixed) job + mandate + the E2E recruiter, and marked Recruito-screened
 * so the company candidate page doesn't 404 (the recruito_screened_at gate).
 */
export async function seedScreenedCandidate(jobId: string, mandateId: string): Promise<string> {
  const recruiterId = await findE2ERecruiterId();
  const sb = admin();
  const { data, error } = await sb
    .from("candidates")
    .insert({
      job_id: jobId,
      recruiter_id: recruiterId,
      mandate_id: mandateId,
      first_name: "E2E",
      last_name: "Messaging Candidate",
      email: "e2e-messaging@example.com",
      status: "reviewing",
      recruito_screened_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Candidate seed failed: ${error?.message}`);
  return data.id;
}

/**
 * Remove conversations/messages and candidates tied to E2E-prefixed jobs.
 * conversations.candidate_id is ON DELETE SET NULL (not cascade), so the
 * conversation rows must be deleted explicitly before the candidate/job rows.
 */
export async function deleteSeededCandidates(): Promise<void> {
  const sb = admin();
  const { data: jobs } = await sb.from("jobs").select("id").like("title", "E2E-%");
  const jobIds = (jobs ?? []).map((j) => j.id);
  if (!jobIds.length) return;

  const { data: cands } = await sb.from("candidates").select("id").in("job_id", jobIds);
  const candIds = (cands ?? []).map((c) => c.id);
  if (!candIds.length) return;

  const { data: convs } = await sb.from("conversations").select("id").in("candidate_id", candIds);
  const convIds = (convs ?? []).map((c) => c.id);
  if (convIds.length) {
    await sb.from("messages").delete().in("conversation_id", convIds);
    await sb.from("conversation_participants").delete().in("conversation_id", convIds);
    await sb.from("conversations").delete().in("id", convIds);
  }
  await sb.from("candidates").delete().in("id", candIds);
}
