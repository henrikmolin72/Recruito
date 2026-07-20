import { describe, it, expect } from "vitest";
import { fillEvaluationPrompt } from "./evaluation-prompt";
import { extractMatchScore } from "./extract-match-score";
import { getMatchLevel, getClientMatchLevel, CLIENT_MATCH_THRESHOLD } from "./match-level";

const filled = () =>
  fillEvaluationPrompt({
    jdText: "Senior Engineer. Minimum 5 years experience. Master's in Computer Science required. Fluent English required.",
    config: { targetSector: null, adjacentSectors: null, transferableSkills: null, customKeywords: null },
    metadata: { screeningId: "s", modelVersion: "m", isoTimestamp: "t", jdId: "j", cvHash: "h" },
  });

describe("evaluation prompt — client deal-breaker gates (2026-07-03 client request)", () => {
  const prompt = filled();

  it("names all three client deal-breakers as hard gates", () => {
    expect(prompt).toMatch(/MINIMUM YEARS OF EXPERIENCE/i);
    expect(prompt).toMatch(/DEGREE at a specific level AND field/i);
    expect(prompt).toMatch(/LANGUAGE PROFICIENCY at a stated level/i);
  });

  it("instructs Not Recommended + a ≤49 score cap + DECLINE when a gate is unmet", () => {
    expect(prompt).toMatch(/NOT RECOMMENDED/i);
    expect(prompt).toMatch(/may exceed 49%/i); // the cap ceiling
    expect(prompt).toMatch(/Overall Recommendation \(Section E\) MUST be DECLINE/i);
    // deal-breaker is the top override in Section E outcome logic
    expect(prompt).toMatch(/unmet deal-breaker \/ hard requirement → DECLINE/i);
  });

  it("carries the deal-breaker cap into the machine-read FINAL_MATCH_SCORE instruction", () => {
    expect(prompt).toMatch(/if any deal-breaker \/ mandatory requirement is unmet, this number MUST NOT exceed 49/i);
  });

  it("orders a machine-readable KEY_GAPS line next to the final score", () => {
    expect(prompt).toMatch(/KEY_GAPS:/);
    expect(prompt).toMatch(/single-line JSON array/i);
    expect(prompt).toMatch(/NEVER list the criteria titles/i);
  });
});

describe("deal-breaker cap → client-facing 'Not Recommended' (end-to-end deterministic tie)", () => {
  // A report where the model applied the cap (deal-breaker unmet) ends its last
  // line with a capped FINAL_MATCH_SCORE. That number must resolve to the
  // Not-Recommended tier and must NOT be surfaced to the client.
  const cappedReport = [
    "...full report prose...",
    "| Overall Recommendation | DECLINE |",
    "FINAL_MATCH_SCORE: 40",
  ].join("\n");

  it("a capped score is below the client threshold", () => {
    const score = extractMatchScore(cappedReport);
    expect(score).toBe(40);
    expect(score! < CLIENT_MATCH_THRESHOLD).toBe(true);
  });

  it("maps to the Not Recommended tier and never reaches the client", () => {
    const score = extractMatchScore(cappedReport);
    expect(getMatchLevel(score).tier).toBe("notRecommended");
    expect(getClientMatchLevel(score)).toBeNull();
  });

  it("49 (the cap ceiling) is still Not Recommended — the cap guarantees the tier", () => {
    expect(getMatchLevel(49).tier).toBe("notRecommended");
    expect(getClientMatchLevel(49)).toBeNull();
  });
});

describe("evaluation prompt — candidate-declared facts (client 14-07-06)", () => {
  it("includes candidate-declared facts and forbids numbered gap bullets", () => {
    const prompt = fillEvaluationPrompt({
      jdText: "JD",
      config: { targetSector: null, adjacentSectors: [], transferableSkills: [], customKeywords: [] },
      metadata: { screeningId: "s", modelVersion: "m", isoTimestamp: "t", jdId: "j", cvHash: "h" },
      declared: { employmentStatus: "employed", yearsExperience: 7 },
    });
    expect(prompt).toContain("CANDIDATE-DECLARED FACTS");
    expect(prompt).toContain("employed");
    expect(prompt).toContain("7");
    expect(prompt).toContain("Do NOT number the bullets");
    expect(prompt).toContain("If the CV clearly contradicts a declared fact");
  });
});
