/**
 * One-time setup for the e2e suite. Promotes the test user to admin and
 * ensures an "E2E Test Co" company row exists. Idempotent — safe to re-run.
 *
 * Usage:
 *   npx dotenv -e .env.local -e .env.test.local -- npx tsx e2e/setup-test-user.ts
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_COMPANY_EMAIL;
  const password = process.env.E2E_COMPANY_PASSWORD;
  if (!url || !anon || !service || !email || !password) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, E2E_COMPANY_EMAIL, E2E_COMPANY_PASSWORD");
  }

  // 1. Resolve user_id by signing in with anon (auth.admin.listUsers is broken on this project)
  const cli = createClient(url, anon, { auth: { persistSession: false } });
  const { data: signin, error: sErr } = await cli.auth.signInWithPassword({ email, password });
  if (sErr) throw new Error(`Sign-in failed: ${sErr.message}`);
  const userId = signin.user.id;

  // 2. Promote to admin
  const sb = createClient(url, service, { auth: { persistSession: false } });
  const { error: updErr } = await sb.auth.admin.updateUserById(userId, {
    app_metadata: { ...signin.user.app_metadata, role: "admin" },
  });
  if (updErr) throw new Error(`Role update failed: ${updErr.message}`);

  // 3. Ensure company row
  const { data: existing } = await sb
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!existing) {
    const { error } = await sb.from("companies").insert({
      user_id: userId,
      company_name: "E2E Test Co",
      org_number: "0000000000",
      industry: "Technology",
    });
    if (error) throw new Error(`Company insert failed: ${error.message}`);
    console.log("Created company E2E Test Co");
  } else {
    console.log("Company already exists");
  }
  console.log(`E2E user ${email} is now admin and owns a company. Ready.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
