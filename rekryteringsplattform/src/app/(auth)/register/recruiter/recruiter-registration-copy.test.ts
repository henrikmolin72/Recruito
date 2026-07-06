import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import en from "@/i18n/dictionaries/en.json";
import sv from "@/i18n/dictionaries/sv.json";
import no from "@/i18n/dictionaries/no.json";
import da from "@/i18n/dictionaries/da.json";

const pageSource = readFileSync(
  fileURLToPath(new URL("./page.tsx", import.meta.url)),
  "utf8",
);

describe("recruiter registration copy", () => {
  it("drops the duplicate subheadline blurb (it repeated applicationReviewNotice)", () => {
    for (const dict of [en, sv, no, da]) {
      expect(dict.auth).not.toHaveProperty("recruiterRegSubheadline");
    }
    expect(pageSource).not.toContain("recruiterRegSubheadline");
  });

  it("credits the candidate's guarantee in feature 2, not the client's", () => {
    expect(en.auth.recruiterRegFeature2Desc).toBe(
      "Commission is paid after successful placement and candidate's guarantee completion.",
    );
  });

  it("references the candidate's guarantee period in the agreement checkbox, not the client's", () => {
    expect(pageSource).toContain("candidate’s guarantee period");
    expect(pageSource).not.toContain("client’s guarantee period");
  });
});
