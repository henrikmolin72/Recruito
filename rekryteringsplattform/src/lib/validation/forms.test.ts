import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/server", () => ({
  createTranslator: async () =>
    (key: string, params?: Record<string, string | number>) =>
      params ? `${key}|${Object.values(params).join(",")}` : key,
}));

import { validateJobForm, validateRegisterRecruiterForm } from "./forms";

export function buildValidJobFormData(): FormData {
  const fd = new FormData();
  fd.set("title", "Junior Data Analyst");
  fd.set("location", "Stockholm");
  fd.set("industry", "Biotechnology");
  fd.set("employment_type", "full_time");
  fd.set("description", "A description that is definitely longer than twenty characters.");
  fd.set("salary_currency", "EUR");
  fd.set("salary_min", "38000");
  fd.set("salary_max", "38000");
  fd.set("max_recruiters", "5");
  fd.set("fee_percentage", "15");
  fd.set("guarantee_period_months", "0");
  fd.set("pipeline_stages", JSON.stringify([{ id: "s1", type: "screening", title: "Screening", order: 0 }]));
  return fd;
}

function buildValidRecruiterFormData(): FormData {
  const fd = new FormData();
  fd.set("email", "jane@example.com");
  fd.set("password", "password1234");
  fd.set("full_name", "Jane Doe");
  fd.set("current_country", "Sweden");
  fd.set("linkedin_url", "");
  fd.set("years_experience_bracket", "2-3");
  fd.set("how_heard", "LinkedIn");
  fd.set("agreement_freelance_recruiter", "on");
  fd.set("agreement_commission_after_guarantee", "on");
  fd.set("legal_eligibility_confirmed", "yes");
  return fd;
}

describe("validateRegisterRecruiterForm — legal eligibility", () => {
  it('records "yes" as confirmed', () => {
    const r = validateRegisterRecruiterForm(buildValidRecruiterFormData());
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.legal_eligibility_confirmed).toBe(true);
  });

  it('records "no" as not confirmed but still valid', () => {
    const fd = buildValidRecruiterFormData();
    fd.set("legal_eligibility_confirmed", "no");
    const r = validateRegisterRecruiterForm(fd);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.legal_eligibility_confirmed).toBe(false);
  });

  it("requires an answer", () => {
    const fd = buildValidRecruiterFormData();
    fd.delete("legal_eligibility_confirmed");
    const r = validateRegisterRecruiterForm(fd);
    expect(r.success).toBe(false);
  });
});

describe("validateJobForm", () => {
  it("accepts a valid full_time job", async () => {
    const r = await validateJobForm(buildValidJobFormData());
    expect(r.success).toBe(true);
  });

  it("rejects non-full_time employment types", async () => {
    const fd = buildValidJobFormData();
    fd.set("employment_type", "contract");
    const r = await validateJobForm(fd);
    expect(r.success).toBe(false);
  });

  it("reports the failing field on validation error", async () => {
    const fd = buildValidJobFormData();
    fd.set("industry", "");
    const r = await validateJobForm(fd);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.field).toBe("industry");
  });

  it("accepts a job with no free-text location (area/zip is optional)", async () => {
    const fd = buildValidJobFormData();
    fd.delete("location");
    const r = await validateJobForm(fd);
    expect(r.success).toBe(true);
  });

  // Currency is an allowlist at the trust boundary: garbage codes crash
  // formatCurrency (Intl RangeError) on every list rendering the stored value.
  it("rejects a salary_currency outside the supported allowlist", async () => {
    const fd = buildValidJobFormData();
    fd.set("salary_currency", "ZZZ");
    const r = await validateJobForm(fd);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.field).toBe("salary_currency");
  });

  // A draft saved before the employer actively chose a currency posts "" —
  // it must parse to NULL (not a silent SEK default) so the edit flow
  // re-prompts the chooser instead of locking fees in a never-chosen currency.
  it("parses an empty salary_currency to null (unchosen draft round-trip)", async () => {
    const fd = buildValidJobFormData();
    fd.set("salary_currency", "");
    fd.delete("salary_min");
    fd.delete("salary_max");
    const r = await validateJobForm(fd);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.salary_currency).toBeNull();
  });
});
