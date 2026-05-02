/**
 * Acceptance suite for the admin fee re-confirmation gate.
 *
 * Mirrors the 5-test plan from the client (Sajid Bhatti, ADMIN):
 *   1. Fee unchanged → direct approve
 *   2. Fee increased → modal → reconfirm flow → company approve
 *   3. Custom-reason validation
 *   4. Admin withdraw to original
 *   5. Client reject
 *
 * Jobs are seeded directly into the DB (status=pending_approval) instead of
 * being published through the 7-step UI wizard. The wizard is unrelated to
 * the gate logic this suite verifies, and seeding is more reliable.
 */
import { test, expect, type BrowserContext, type Browser, type Page } from "@playwright/test";
import { ADMIN_CREDS, COMPANY_CREDS, assertCredsPresent, loginAs } from "./fixtures/auth";
import { seedJob, deleteSeededJobs } from "./helpers/seed-job";

test.beforeAll(async () => {
  assertCredsPresent();
  await deleteSeededJobs();
});

test.afterAll(async () => {
  await deleteSeededJobs();
});

interface Personas {
  companyCtx: BrowserContext;
  adminCtx: BrowserContext;
  companyPage: Page;
  adminPage: Page;
}

async function setupPersonas(browser: Browser): Promise<Personas> {
  const companyCtx = await loginAs(browser, COMPANY_CREDS);
  const adminCtx = await loginAs(browser, ADMIN_CREDS);
  const companyPage = await companyCtx.newPage();
  const adminPage = await adminCtx.newPage();
  return { companyCtx, adminCtx, companyPage, adminPage };
}

async function teardown(p: Personas) {
  await p.companyCtx.close();
  await p.adminCtx.close();
}

function uniqueTitle(prefix: string) {
  return `E2E-${prefix}-${Date.now().toString(36)}`;
}

function adminRow(page: Page, title: string) {
  return page.locator("tr", { hasText: title });
}

/** Build a regex that matches a number with any optional thousands separator (space, NBSP, comma). */
function moneyRegex(amount: number): RegExp {
  const s = String(amount);
  const withSep = s.length > 3 ? s.slice(0, -3) + "[\\s\\u00a0,]?" + s.slice(-3) : s;
  return new RegExp(withSep);
}

async function editClientFee(page: Page, title: string, amount: number) {
  const row = adminRow(page, title);
  await row.locator('button:has-text("€"), button:has-text("kr"), button:has-text("$")').first().click();
  const input = row.locator('input[type="number"]').first();
  await input.fill(String(amount));
  await input.press("Enter");
  await expect(page.getByText(/fee updated|avgift uppdaterad/i)).toBeVisible({ timeout: 5_000 });
}

// Test 1 — fee unchanged (no re-confirm)
test("Test 1: fee unchanged → admin direct approve", async ({ browser }) => {
  const p = await setupPersonas(browser);
  try {
    const title = uniqueTitle("T1");
    await seedJob({ title, estimatedFee: 4_950 });

    await p.adminPage.goto("/admin/jobs");
    const row = adminRow(p.adminPage, title);
    await expect(row).toContainText(/pending/i);

    await row.getByRole("button", { name: /^approve$/i }).click();
    await expect(p.adminPage.getByText(/approved/i).first()).toBeVisible({ timeout: 5_000 });

    await p.adminPage.reload();
    await expect(adminRow(p.adminPage, title)).toContainText(/active/i);
    await expect(adminRow(p.adminPage, title)).toContainText(moneyRegex(4_950));
  } finally {
    await teardown(p);
  }
});

// Test 2 — fee increased (the actual gate) ⭐
test("Test 2: fee increased → modal → reconfirm flow", async ({ browser }) => {
  const p = await setupPersonas(browser);
  try {
    const title = uniqueTitle("T2");
    const { id: jobId, estimatedFee } = await seedJob({ title, estimatedFee: 4_950 });
    const newFee = 7_000;

    await p.adminPage.goto("/admin/jobs");
    await editClientFee(p.adminPage, title, newFee);
    await p.adminPage.waitForLoadState("networkidle");

    const upliftBtn = adminRow(p.adminPage, title).getByRole("button", {
      name: /approve.*re-?confirm|re-?confirm/i,
    });
    await expect(upliftBtn).toBeVisible();
    await upliftBtn.click();

    await p.adminPage.locator("select").selectOption("hard_to_fill");
    await p.adminPage.getByRole("button", { name: /send request|skicka/i }).click();
    // Wait for modal to close — confirms the server action completed successfully.
    await expect(p.adminPage.locator('select')).toBeHidden({ timeout: 10_000 });

    await p.adminPage.reload();
    await expect(adminRow(p.adminPage, title)).toContainText(/awaiting client re-?confirm/i);
    await expect(adminRow(p.adminPage, title).getByRole("button", { name: /withdraw/i })).toBeVisible();

    // Company side
    await p.companyPage.goto("/company");
    // Banner is visible (singular "needs" or plural "need" depending on count)
    await expect(p.companyPage.getByText(/your re-?confirmation/i)).toBeVisible();
    // Navigate directly to the seeded job's detail page (avoids ambiguity when multiple jobs need reconfirm).
    await p.companyPage.goto(`/company/jobs/${jobId}`);
    await expect(p.companyPage.getByText(/fee re-?confirmation needed/i)).toBeVisible();
    await expect(p.companyPage.getByText(moneyRegex(estimatedFee)).first()).toBeVisible();
    await expect(p.companyPage.getByText(moneyRegex(newFee)).first()).toBeVisible();
    await expect(p.companyPage.getByText(/hard-?to-?fill/i)).toBeVisible();

    await p.companyPage.getByRole("button", { name: /approve new fee/i }).click();
    await expect(p.companyPage.getByText(/new fee approved/i)).toBeVisible();

    await p.adminPage.goto("/admin/jobs");
    await expect(adminRow(p.adminPage, title)).toContainText(/active/i);
    await expect(adminRow(p.adminPage, title)).toContainText(moneyRegex(newFee));
  } finally {
    await teardown(p);
  }
});

// Test 3 — custom-reason validation
test("Test 3: custom reason requires note", async ({ browser }) => {
  const p = await setupPersonas(browser);
  try {
    const title = uniqueTitle("T3");
    await seedJob({ title, estimatedFee: 4_950 });

    await p.adminPage.goto("/admin/jobs");
    await editClientFee(p.adminPage, title, 6_500);
    await p.adminPage.waitForLoadState("networkidle");

    await adminRow(p.adminPage, title).getByRole("button", { name: /re-?confirm/i }).click();
    await p.adminPage.locator("select").selectOption("custom");
    await p.adminPage.getByRole("button", { name: /send request|skicka/i }).click();
    // Modal must remain open on validation error
    await expect(p.adminPage.locator("textarea")).toBeVisible();

    await p.adminPage.locator("textarea").fill("Specialist role with hard requirements.");
    await p.adminPage.getByRole("button", { name: /send request|skicka/i }).click();
    await expect(p.adminPage.locator("textarea")).toBeHidden({ timeout: 5_000 });
  } finally {
    await teardown(p);
  }
});

// Test 4 — admin withdraw
test("Test 4: admin withdraw to original", async ({ browser }) => {
  const p = await setupPersonas(browser);
  try {
    const title = uniqueTitle("T4");
    const { estimatedFee } = await seedJob({ title, estimatedFee: 4_950 });

    await p.adminPage.goto("/admin/jobs");
    await editClientFee(p.adminPage, title, 6_000);
    await p.adminPage.waitForLoadState("networkidle");
    await adminRow(p.adminPage, title).getByRole("button", { name: /re-?confirm/i }).click();
    await p.adminPage.locator("select").selectOption("hard_to_fill");
    await p.adminPage.getByRole("button", { name: /send request|skicka/i }).click();
    await expect(p.adminPage.locator("select")).toBeHidden({ timeout: 10_000 });

    await p.adminPage.reload();
    await adminRow(p.adminPage, title).getByRole("button", { name: /withdraw/i }).click();
    // Wait for the action to commit before reloading.
    await expect(p.adminPage.getByText(/withdrawn/i)).toBeVisible({ timeout: 10_000 });

    await p.adminPage.reload();
    await expect(adminRow(p.adminPage, title)).toContainText(/active/i);
    await expect(adminRow(p.adminPage, title)).toContainText(moneyRegex(estimatedFee));
  } finally {
    await teardown(p);
  }
});

// Test 5 — client reject
test("Test 5: client rejects the new fee", async ({ browser }) => {
  const p = await setupPersonas(browser);
  try {
    const title = uniqueTitle("T5");
    const { id: jobId } = await seedJob({ title, estimatedFee: 4_950 });

    await p.adminPage.goto("/admin/jobs");
    await editClientFee(p.adminPage, title, 6_500);
    await p.adminPage.waitForLoadState("networkidle");
    await adminRow(p.adminPage, title).getByRole("button", { name: /re-?confirm/i }).click();
    await p.adminPage.locator("select").selectOption("hard_to_fill");
    await p.adminPage.getByRole("button", { name: /send request|skicka/i }).click();
    await expect(p.adminPage.locator("select")).toBeHidden({ timeout: 10_000 });

    await p.companyPage.goto(`/company/jobs/${jobId}`);
    await expect(p.companyPage.getByText(/fee re-?confirmation needed/i)).toBeVisible();
    await p.companyPage.getByRole("button", { name: /^reject$/i }).click();
    await expect(p.companyPage.getByText(/fee rejected/i)).toBeVisible({ timeout: 10_000 });

    await p.adminPage.goto("/admin/jobs");
    await expect(adminRow(p.adminPage, title)).toContainText(/pending/i);
  } finally {
    await teardown(p);
  }
});
