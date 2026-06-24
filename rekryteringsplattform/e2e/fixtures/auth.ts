import { type BrowserContext, type Browser, expect } from "@playwright/test";

export interface Creds {
  email: string;
  password: string;
}

export const COMPANY_CREDS: Creds = {
  email: process.env.E2E_COMPANY_EMAIL ?? "",
  password: process.env.E2E_COMPANY_PASSWORD ?? "",
};

export const ADMIN_CREDS: Creds = {
  email: process.env.E2E_ADMIN_EMAIL ?? "",
  password: process.env.E2E_ADMIN_PASSWORD ?? "",
};

export const RECRUITER_CREDS: Creds = {
  email: process.env.E2E_RECRUITER_EMAIL ?? "",
  password: process.env.E2E_RECRUITER_PASSWORD ?? "",
};

export function assertCredsPresent() {
  for (const [k, v] of Object.entries({
    E2E_COMPANY_EMAIL: COMPANY_CREDS.email,
    E2E_COMPANY_PASSWORD: COMPANY_CREDS.password,
    E2E_ADMIN_EMAIL: ADMIN_CREDS.email,
    E2E_ADMIN_PASSWORD: ADMIN_CREDS.password,
  })) {
    if (!v) throw new Error(`Missing env var ${k}. Copy .env.test.local.example to .env.test.local and fill it in.`);
  }
}

export async function loginAs(browser: Browser, creds: Creds): Promise<BrowserContext> {
  const ctx = await browser.newContext();
  // Force English UI so test selectors don't depend on Swedish translations.
  await ctx.addCookies([
    { name: "NEXT_LOCALE", value: "en", url: process.env.E2E_BASE_URL ?? "http://localhost:3000" },
  ]);
  const page = await ctx.newPage();
  await page.goto("/login");
  await page.fill('input[name="email"]', creds.email);
  await page.fill('input[name="password"]', creds.password);
  // Click the only button inside the login form (label varies by locale).
  await page.locator('form').getByRole('button').click();
  // Wait until we are off the login route — covers redirect to /company, /admin, /recruiter.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
  await page.close();
  return ctx;
}
