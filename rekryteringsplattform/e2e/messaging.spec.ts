/**
 * Regression guard for the in-app messaging RLS bug (fixed 2026-06-22).
 *
 * Before the fix, sending the first message on the company "Chat with Recruiter"
 * tab silently failed: `sendMessage` created the conversation with the RLS-scoped
 * client, but the `conversations` SELECT policy only exposes a row to its
 * participants (seeded afterward) — so `insert().select()` read back nothing, the
 * action errored, the optimistic bubble reverted into the input, and nothing
 * persisted (production had 0 conversations / 0 messages, ever).
 *
 * This drives the real UI: it seeds a Recruito-screened candidate for the E2E
 * company, sends a message, and asserts the message PERSISTS across a reload and
 * the composer clears — both of which only happen when the action returns success.
 *
 * Requires the E2E recruiter account (`npm run test:smoke:setup`) so the candidate
 * can be linked to a recruiter (sendMessage resolves the recruiter participant).
 */
import { test, expect } from "@playwright/test";
import { COMPANY_CREDS, assertCredsPresent, loginAs } from "./fixtures/auth";
import { seedJob, deleteSeededJobs } from "./helpers/seed-job";
import { seedMandate, deleteSeededMandates } from "./helpers/seed-mandate";
import { seedScreenedCandidate, deleteSeededCandidates } from "./helpers/seed-candidate";

let jobId: string;
let candidateId: string;

test.beforeAll(async () => {
  assertCredsPresent();
  if (!process.env.E2E_RECRUITER_EMAIL) {
    throw new Error("Missing E2E_RECRUITER_EMAIL — run `npm run test:smoke:setup` first");
  }
  // Order matters: conversations/candidates first (FKs), then mandates, then jobs.
  await deleteSeededCandidates();
  await deleteSeededMandates();
  await deleteSeededJobs();

  const job = await seedJob({ title: `E2E-MSG-${Date.now().toString(36)}`, status: "active" });
  jobId = job.id;
  const mandateId = await seedMandate(jobId);
  candidateId = await seedScreenedCandidate(jobId, mandateId);
});

test.afterAll(async () => {
  await deleteSeededCandidates();
  await deleteSeededMandates();
  await deleteSeededJobs();
});

test("company message to recruiter persists (does not revert)", async ({ browser }) => {
  const ctx = await loginAs(browser, COMPANY_CREDS);
  const page = await ctx.newPage();
  try {
    await page.goto(`/company/jobs/${jobId}/candidates/${candidateId}`);

    // Composer in the default "Chat with Recruiter" tab.
    const composer = page.getByPlaceholder(/write a message/i);
    await expect(composer).toBeVisible({ timeout: 15_000 });

    const body = `E2E ping ${Date.now().toString(36)}`;
    await composer.fill(body);
    // The chat form submits on the icon button (type=submit).
    await page.locator("form", { has: composer }).locator('button[type="submit"]').click();

    // Success path: optimistic bubble stays + composer clears. The pre-fix bug did
    // the opposite — removed the bubble and restored the typed text.
    await expect(page.getByText(body)).toBeVisible({ timeout: 10_000 });
    await expect(composer).toHaveValue("", { timeout: 10_000 });

    // Persistence is the real assertion: after a reload the message must still be
    // present, proving it came from the database (not optimistic state).
    await page.reload();
    await expect(page.getByText(body)).toBeVisible({ timeout: 15_000 });
  } finally {
    await ctx.close();
  }
});
