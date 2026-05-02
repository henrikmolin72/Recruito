import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

const E2E_COMPANY_NAME = "E2E Test Co";

let cachedCompanyId: string | null = null;
async function findE2ECompanyId(): Promise<string> {
  if (cachedCompanyId) return cachedCompanyId;
  const sb = admin();
  const { data, error } = await sb
    .from("companies")
    .select("id")
    .eq("company_name", E2E_COMPANY_NAME)
    .single();
  if (error || !data) {
    throw new Error(
      `No "${E2E_COMPANY_NAME}" company found. Run the e2e setup script to create it.`,
    );
  }
  cachedCompanyId = data.id;
  return data.id;
}

export interface SeedJobInput {
  title: string;
  /** Final fee admin sees. Defaults to estimatedFee if omitted. */
  clientFeeAmount?: number;
  /** Baseline fee at submission. Required for the gate to evaluate uplift. */
  estimatedFee?: number;
  status?: "pending_approval" | "active";
}

/**
 * Insert a job row directly via service role, bypassing the create-job UI.
 * Returns the inserted row id and title (caller uses title to find the row in admin UI).
 */
export async function seedJob(
  input: SeedJobInput,
): Promise<{ id: string; title: string; estimatedFee: number }> {
  const company_id = await findE2ECompanyId();
  const estimatedFee = input.estimatedFee ?? 4_950;
  const clientFeeAmount = input.clientFeeAmount ?? estimatedFee;
  const status = input.status ?? "pending_approval";

  const sb = admin();
  const { data, error } = await sb
    .from("jobs")
    .insert({
      company_id,
      title: input.title,
      description: "Seeded by Playwright E2E. Description content padding.",
      industry: "Technology",
      location: "Stockholm",
      employment_type: "Heltid",
      salary_min: 50_000,
      salary_max: 70_000,
      salary_currency: "EUR",
      fee_percentage: 15.0,
      max_recruiters: 5,
      status,
      client_fee_amount: clientFeeAmount,
      client_fee_amount_estimated: estimatedFee,
    })
    .select("id, title")
    .single();
  if (error || !data) throw new Error(`Seed failed: ${error?.message}`);
  return { id: data.id, title: data.title, estimatedFee };
}

/**
 * Reset a seeded job back to pending_approval and its estimated baseline.
 * Useful when running the suite multiple times against the same DB.
 */
export async function deleteSeededJobs(): Promise<void> {
  const sb = admin();
  await sb.from("jobs").delete().like("title", "E2E-%");
}
