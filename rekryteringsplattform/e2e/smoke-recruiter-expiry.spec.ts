import { test, expect } from "@playwright/test";
import { loginAs, ADMIN_CREDS, assertCredsPresent } from "./fixtures/auth";

// Read-only smoke for the recruiter-side "Expire Date" changes (Expired tab +
// all-recruiter job process panel). The E2E_ADMIN account is a recruiter-role
// user, so it exercises the recruiter views. No mutations.
test("recruiter: Expired tab + job Ongoing-process panel render", async ({ browser }) => {
    assertCredsPresent();
    const ctx = await loginAs(browser, ADMIN_CREDS);
    const page = await ctx.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

    // 1) My Mandates → the new "Expired" tab is present alongside Active/Closed/Hired.
    await page.goto("/recruiter/mandates");
    await page.waitForLoadState("networkidle");
    const tabTexts = await page.getByRole("button").allInnerTexts();
    console.log(`[smoke] mandate tabs: ${JSON.stringify(tabTexts.filter((t) => /Active|Closed|Expired|Hired/.test(t)))}`);
    await expect(page.getByRole("button", { name: /Expired/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Closed/ })).toBeVisible();

    // Clicking Expired switches tab without error.
    await page.getByRole("button", { name: /Expired/ }).click();

    // 2) Browse Jobs → open a job → "Ongoing process" panel with the 4 stats.
    await page.goto("/recruiter/jobs");
    await page.waitForLoadState("networkidle");
    const jobLinks = page.locator('a[href^="/recruiter/jobs/"]');
    const jobCount = await jobLinks.count();
    console.log(`[smoke] browsable jobs: ${jobCount}`);

    if (jobCount > 0) {
        const href = await jobLinks.first().getAttribute("href");
        console.log(`[smoke] opening job: ${href}`);
        await jobLinks.first().click();
        await expect(page).toHaveURL(/\/recruiter\/jobs\/[0-9a-f-]+/);
        await expect(page.getByRole("heading", { name: "Ongoing process" })).toBeVisible();
        for (const label of ["Presented", "In process", "In interview", "Rejected"]) {
            await expect(page.getByText(label, { exact: true })).toBeVisible();
        }
    }

    expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
    await ctx.close();
});
