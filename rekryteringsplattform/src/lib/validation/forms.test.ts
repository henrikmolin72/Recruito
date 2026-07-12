import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/server", () => ({
  createTranslator: async () =>
    (key: string, params?: Record<string, string | number>) =>
      params ? `${key}|${Object.values(params).join(",")}` : key,
}));

import { validateJobForm } from "./forms";

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
    fd.set("location", "");
    const r = await validateJobForm(fd);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.field).toBe("location");
  });
});
