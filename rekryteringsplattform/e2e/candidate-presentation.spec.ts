import { test, expect } from "@playwright/test";
import { loginAs, RECRUITER_CREDS } from "./fixtures/auth";

// Per-candidate AI presentation (replaced the batch Top-5 shortlist 2026-07-10).
// Requires the local stack seed: a recruiter mandate whose candidates include
// one WITH a stored candidate_screenings row and one WITHOUT. The happy path
// hits the Anthropic Messages API — point ANTHROPIC_BASE_URL at a local mock
// (deterministic, no secret) or provide a real ANTHROPIC_API_KEY.
test.describe("candidate presentation generator", () => {
  test("per-row generate: happy path + no-evaluation error", async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await loginAs(browser, RECRUITER_CREDS);
    const page = await ctx.newPage();

    await page.goto("/recruiter/mandates");
    // Dismiss the cookie banner (mounts after hydration; its fixed bottom bar
    // otherwise intercepts clicks on the lower table rows).
    await page
      .getByRole("button", { name: "Necessary only" })
      .click({ timeout: 5_000 })
      .catch(() => {});
    // The list defaults to the Active tab; the seed mandate may sit in another
    // bucket (e.g. Hired) — open the first non-empty tab, then the first detail
    // link (UUID href; the sidebar link has no trailing slash and won't match).
    await page.getByRole("button", { name: /\([1-9]\d*\)/ }).first().click();
    await page.locator('a[href*="/recruiter/mandates/"]').first().click();
    await expect(page).toHaveURL(/\/recruiter\/mandates\/[0-9a-f-]{36}/);

    // The old batch button is gone; per-row buttons exist instead.
    await expect(page.getByRole("button", { name: /Top-5/i })).toHaveCount(0);
    const rowButtons = page.getByRole("button", { name: /AI Presentation/i });
    await expect(rowButtons.first()).toBeVisible();

    // Candidate WITHOUT a stored evaluation → friendly error in the modal.
    const noEvalRow = page.locator("tr", { hasText: "Ivan Intervju" });
    await noEvalRow.getByRole("button", { name: /AI Presentation/i }).click();
    await expect(page.getByText(/No AI evaluation found/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Close" }).click();

    // Candidate WITH a stored evaluation → live generation → pitch + share text.
    const row = page.locator("tr", { hasText: "Ulla Review" });
    await row.getByRole("button", { name: /AI Presentation/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Share text")).toBeVisible({ timeout: 60_000 });
    await expect(dialog.getByText("Ulla Review").first()).toBeVisible();
    const shareText = await dialog.locator("pre").innerText();
    expect(shareText.trim().length).toBeGreaterThan(40);
    // Client-facing text must not leak numeric AI scores (redaction decision 2026-07-02).
    expect(shareText).not.toMatch(/\d{1,3}\s*(\/\s*100|%)/);
    await expect(dialog.getByRole("button", { name: /Copy to clipboard/i })).toBeVisible();
  });
});
