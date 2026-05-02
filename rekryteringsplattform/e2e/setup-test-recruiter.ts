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
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_RECRUITER_EMAIL;
  const password = process.env.E2E_RECRUITER_PASSWORD;

  if (!url || !service || !email || !password) {
    throw new Error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, E2E_RECRUITER_EMAIL, E2E_RECRUITER_PASSWORD"
    );
  }

  // Refuse to run against production. Require an explicit allowlisted project
  // ref or an opt-in env var so a misconfigured CI secret cannot wipe prod data.
  const allowedRef = process.env.E2E_SUPABASE_PROJECT_REF;
  const projectRef = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
  if (process.env.E2E_ALLOW_PRODUCTION !== "1") {
    if (!projectRef) {
      throw new Error(`Could not parse Supabase project ref from URL: ${url}`);
    }
    if (allowedRef && projectRef !== allowedRef) {
      throw new Error(
        `Refusing to run: Supabase project ref '${projectRef}' does not match E2E_SUPABASE_PROJECT_REF '${allowedRef}'.`
      );
    }
    if (/prod/i.test(url)) {
      throw new Error(`Refusing to run against URL containing 'prod': ${url}`);
    }
  }

  const sb = createClient(url, service, { auth: { persistSession: false } });

  // 1. Get or create the auth user.
  // Use admin.listUsers to check existence deterministically — signInWithPassword
  // can fail for reasons other than "user doesn't exist" (rotated password, MFA,
  // service outage), and silently falling through to createUser would mask those.
  let userId: string;
  const { data: list, error: listErr } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`);
  const existingUser = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    userId = existingUser.id;
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
