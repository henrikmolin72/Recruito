/**
 * E2E coverage for the Recruito thread SPLIT + the bug fixes shipped on
 * `fix/messaging-split-recruito-threads` (migration 060).
 *
 * Background — migration 060 split the single shared `recruito` conversation
 * (company + recruiter + admins in one thread) into two PRIVATE per-party
 * threads:
 *   'recruito_company'   — the company's private thread with Recruito/admins
 *   'recruito_recruiter' — the recruiter's private thread with Recruito/admins
 * Privacy is enforced by participant-based RLS (the company is the only
 * participant of its thread; the recruiter the only participant of its own).
 * Admins read/write every thread via the service-role client (requireAdmin),
 * and are NOT participants. Sender names are resolved through that service-role
 * client so cross-party / admin messages no longer render as "Unknown".
 *
 * What the unit tests cannot exercise (and this spec does):
 *  1. PRIVACY SEPARATION — drive the real RLS: the company's "Chat with Recruito"
 *     tab must NOT surface the recruiter's message, and vice versa.
 *  2. SENDER NAMES ("Unknown" regression) — in a thread containing a message
 *     authored by another actor (admin), the rendered sender label must be a real
 *     name, never the "Unknown" fallback.
 *  3. ADMIN PER-PARTY — the admin inbox shows BOTH party threads for one
 *     candidate as distinct rows, and an admin reply sent to ONE party lands only
 *     in that party's thread.
 *
 * Actors / fixtures (lowest-churn, reuses the existing setup scripts):
 *  - COMPANY_CREDS   — the E2E company account (`npm run test:e2e:setup`). The
 *    same setup promotes this account to `role: admin`, but here we keep roles
 *    separate and use a dedicated admin account for the admin assertions.
 *  - RECRUITER_CREDS — the E2E recruiter account (`npm run test:smoke:setup`).
 *  - ADMIN_CREDS     — an admin account. Admins see all threads via service role,
 *    so this account does not need any relation to the seeded candidate.
 *
 * Requires (same as messaging.spec.ts) the recruiter account to exist so the
 * candidate can be linked to a recruiter, PLUS migration 060 applied to the test
 * DB (otherwise the two split thread types don't exist).
 */
import { test, expect, type Page } from "@playwright/test";
import {
  COMPANY_CREDS,
  RECRUITER_CREDS,
  ADMIN_CREDS,
  assertCredsPresent,
  loginAs,
} from "./fixtures/auth";
import { seedJob, deleteSeededJobs } from "./helpers/seed-job";
import { seedMandate, deleteSeededMandates } from "./helpers/seed-mandate";
import { seedScreenedCandidate, deleteSeededCandidates } from "./helpers/seed-candidate";

let jobId: string;
let mandateId: string;
let candidateId: string;

// Unique per-run message bodies so assertions can't collide with stale data.
const tag = Date.now().toString(36);
const COMPANY_MSG = `COMPANY→Recruito ${tag}`;
const RECRUITER_MSG = `RECRUITER→Recruito ${tag}`;
const ADMIN_TO_COMPANY_MSG = `ADMIN→company ${tag}`;

test.beforeAll(async () => {
  assertCredsPresent();
  if (!RECRUITER_CREDS.email || !RECRUITER_CREDS.password) {
    throw new Error(
      "Missing E2E_RECRUITER_EMAIL / E2E_RECRUITER_PASSWORD — run `npm run test:smoke:setup` first",
    );
  }
  // Order matters: conversations/candidates first (FKs), then mandates, then jobs.
  await deleteSeededCandidates();
  await deleteSeededMandates();
  await deleteSeededJobs();

  const job = await seedJob({ title: `E2E-MSGSPLIT-${tag}`, status: "active" });
  jobId = job.id;
  mandateId = await seedMandate(jobId);
  candidateId = await seedScreenedCandidate(jobId, mandateId);
});

test.afterAll(async () => {
  await deleteSeededCandidates();
  await deleteSeededMandates();
  await deleteSeededJobs();
});

/**
 * Open the "Chat with Recruito" tab and return the VISIBLE composer.
 * Both tab panels stay mounted (the inactive one is CSS-`hidden`), so each
 * renders a composer — scope to `:visible` to avoid a strict-mode 2-match.
 */
async function openRecruitoTab(page: Page) {
  await page.getByRole("button", { name: "Chat with Recruito" }).click();
  const composer = page.getByPlaceholder(/write a message/i).locator("visible=true");
  await expect(composer).toBeVisible({ timeout: 15_000 });
  return composer;
}

/** Type + submit into the given composer (the form's icon submit button). */
async function sendInComposer(page: Page, composer: ReturnType<Page["getByPlaceholder"]>, body: string) {
  await composer.fill(body);
  await page.locator("form", { has: composer }).locator('button[type="submit"]').click();
  // Optimistic bubble appears and the composer clears on success.
  await expect(page.getByText(body, { exact: false })).toBeVisible({ timeout: 10_000 });
  await expect(composer).toHaveValue("", { timeout: 10_000 });
}

test("company & recruiter Recruito threads are private (RLS split)", async ({ browser }) => {
  // 1. Company posts into its own Recruito thread.
  const companyCtx = await loginAs(browser, COMPANY_CREDS);
  const companyPage = await companyCtx.newPage();
  try {
    await companyPage.goto(`/company/jobs/${jobId}/candidates/${candidateId}`);
    const companyComposer = await openRecruitoTab(companyPage);
    await sendInComposer(companyPage, companyComposer, COMPANY_MSG);
  } finally {
    await companyCtx.close();
  }

  // 2. Recruiter posts into its own (separate) Recruito thread.
  const recruiterCtx = await loginAs(browser, RECRUITER_CREDS);
  const recruiterPage = await recruiterCtx.newPage();
  try {
    await recruiterPage.goto(`/recruiter/mandates/${mandateId}/candidates/${candidateId}`);
    const recruiterComposer = await openRecruitoTab(recruiterPage);
    await sendInComposer(recruiterPage, recruiterComposer, RECRUITER_MSG);

    // PRIVACY: recruiter sees its own message but NOT the company's.
    await expect(recruiterPage.getByText(RECRUITER_MSG, { exact: false })).toBeVisible();
    await expect(recruiterPage.getByText(COMPANY_MSG, { exact: false })).toHaveCount(0);
  } finally {
    await recruiterCtx.close();
  }

  // 3. Re-open the company thread: it must show the company message but NOT the
  //    recruiter's. (Fresh context so we read from the DB, not optimistic state.)
  const companyCtx2 = await loginAs(browser, COMPANY_CREDS);
  const companyPage2 = await companyCtx2.newPage();
  try {
    await companyPage2.goto(`/company/jobs/${jobId}/candidates/${candidateId}`);
    await openRecruitoTab(companyPage2);
    await expect(companyPage2.getByText(COMPANY_MSG, { exact: false })).toBeVisible();
    await expect(companyPage2.getByText(RECRUITER_MSG, { exact: false })).toHaveCount(0);
  } finally {
    await companyCtx2.close();
  }
});

test("admin sees both party threads; reply is per-party and sender name resolves (no 'Unknown')", async ({
  browser,
}) => {
  // ADMIN PER-PARTY: the inbox lists BOTH party threads for this candidate.
  const adminCtx = await loginAs(browser, ADMIN_CREDS);
  const adminPage = await adminCtx.newPage();
  try {
    await adminPage.goto("/admin/messages");

    // Two distinct rows link to the same candidate, one per party.
    const companyRow = adminPage.locator(
      `a[href="/admin/messages/${candidateId}?party=company"]`,
    );
    const recruiterRow = adminPage.locator(
      `a[href="/admin/messages/${candidateId}?party=recruiter"]`,
    );
    await expect(companyRow).toHaveCount(1);
    await expect(recruiterRow).toHaveCount(1);

    // Admin replies into the COMPANY party thread only.
    await adminPage.goto(`/admin/messages/${candidateId}?party=company`);
    const adminComposer = adminPage.getByPlaceholder(/write a message/i);
    await expect(adminComposer).toBeVisible({ timeout: 15_000 });
    await adminComposer.fill(ADMIN_TO_COMPANY_MSG);
    await adminPage
      .locator("form", { has: adminComposer })
      .locator('button[type="submit"]')
      .click();
    await expect(adminPage.getByText(ADMIN_TO_COMPANY_MSG, { exact: false })).toBeVisible({
      timeout: 10_000,
    });
  } finally {
    await adminCtx.close();
  }

  // The admin reply must appear in the COMPANY Recruito tab, with a REAL sender
  // name (service-role resolution) — never the "Unknown" fallback. Pre-fix the
  // cross-actor sender rendered as "Unknown".
  const companyCtx = await loginAs(browser, COMPANY_CREDS);
  const companyPage = await companyCtx.newPage();
  try {
    await companyPage.goto(`/company/jobs/${jobId}/candidates/${candidateId}`);
    await openRecruitoTab(companyPage);
    // The visible Recruito chat card (the inactive client card is CSS-hidden).
    const chatCard = companyPage.locator('.flex.flex-col.h-\\[600px\\]:visible');

    const adminBubble = companyPage.getByText(ADMIN_TO_COMPANY_MSG, { exact: false });
    await expect(adminBubble).toBeVisible({ timeout: 10_000 });

    // SENDER NAME: no message in the visible Recruito thread is labelled "Unknown".
    // (The admin reply is authored by another actor; the company is not "me" here.)
    await expect(chatCard.getByText(/^Unknown$/)).toHaveCount(0);
    await expect(chatCard.getByText(/^Okänd$/)).toHaveCount(0);
  } finally {
    await companyCtx.close();
  }

  // PER-PARTY ISOLATION: the admin's company-thread reply must NOT leak into the
  // recruiter's private Recruito thread.
  const recruiterCtx = await loginAs(browser, RECRUITER_CREDS);
  const recruiterPage = await recruiterCtx.newPage();
  try {
    await recruiterPage.goto(`/recruiter/mandates/${mandateId}/candidates/${candidateId}`);
    await openRecruitoTab(recruiterPage);
    await expect(recruiterPage.getByText(ADMIN_TO_COMPANY_MSG, { exact: false })).toHaveCount(0);
  } finally {
    await recruiterCtx.close();
  }
});
