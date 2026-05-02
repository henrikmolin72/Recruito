/**
 * One-time setup: creates an E2E recruiter auth user and recruiter row.
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   npm run test:smoke:setup
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_RECRUITER_EMAIL;
  const password = process.env.E2E_RECRUITER_PASSWORD;

  if (!url || !anon || !service || !email || !password) {
    throw new Error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, E2E_RECRUITER_EMAIL, E2E_RECRUITER_PASSWORD"
    );
  }

  const sb = createClient(url, service, { auth: { persistSession: false } });

  // 1. Get or create the auth user
  let userId: string;
  const anon_cli = createClient(url, anon, { auth: { persistSession: false } });
  const { data: signin } = await anon_cli.auth.signInWithPassword({ email, password });
  if (signin?.user) {
    userId = signin.user.id;
    console.log(`Recruiter auth user already exists: ${email}`);
  } else {
    const { data: created, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "recruiter" },
    });
    if (error || !created?.user) throw new Error(`Create user failed: ${error?.message}`);
    userId = created.user.id;
    console.log(`Created recruiter auth user: ${email}`);
  }

  // 2. Ensure recruiter row (profiles row is created by DB trigger on auth.users insert)
  const { data: existing } = await sb
    .from("recruiters")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    const { error } = await sb.from("recruiters").insert({
      user_id: userId,
      approval_status: "approved",
      headline: "E2E Test Recruiter",
    });
    if (error) throw new Error(`Recruiter insert failed: ${error.message}`);
    console.log("Created recruiters row (approved)");
  } else {
    // Ensure approval_status is 'approved' so the mandate seed works
    await sb.from("recruiters").update({ approval_status: "approved" }).eq("user_id", userId);
    console.log("Recruiter row already exists — ensured approved");
  }

  console.log(`E2E recruiter ${email} is ready.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
