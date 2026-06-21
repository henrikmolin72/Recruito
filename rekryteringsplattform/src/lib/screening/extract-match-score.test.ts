import { describe, it, expect } from "vitest";
import { extractMatchScore } from "./extract-match-score";

describe("extractMatchScore", () => {
  it("prefers the Adjusted Match Score over the Direct Match Score", () => {
    const md = "Direct Match Score: 62%\nAdjusted Match Score: 81%";
    expect(extractMatchScore(md)).toBe(81);
  });

  it("falls back to the Direct Match Score when no adjusted score exists", () => {
    const md = "## Summary\nDirect Match Score: 88%\n";
    expect(extractMatchScore(md)).toBe(88);
  });

  it("parses scores from a summary table row", () => {
    const md = "| Metric | Value |\n| Direct Match Score | 62% |\n";
    expect(extractMatchScore(md)).toBe(62);
  });

  it("handles the arrow format Direct -> Adjusted", () => {
    const md = "Direct Match Score: 50%  →  Adjusted Match Score: 74%";
    expect(extractMatchScore(md)).toBe(74);
  });

  it("ignores a non-numeric Adjusted score and uses Direct", () => {
    const md = "Adjusted Match Score: N/A\nDirect Match Score: 90%";
    expect(extractMatchScore(md)).toBe(90);
  });

  it("rejects out-of-range values", () => {
    expect(extractMatchScore("Direct Match Score: 120%")).toBeNull();
  });

  it("returns null when no score is present", () => {
    expect(extractMatchScore("No score in this report.")).toBeNull();
    expect(extractMatchScore("")).toBeNull();
  });

  // Realistic multi-occurrence reports: the label appears in the early
  // transferable-skills section (11c) AND the canonical final SECTION E table.
  // The SECTION E figure (last) must win.
  it("picks the canonical SECTION E adjusted score over the earlier 11c mention", () => {
    const report = `
2. DIRECT MATCH SCORE
   72%

SECTION C — TRANSFERABLE SKILLS
11c. Adjusted Match Score
   Direct Match Score: 72%  →  Adjusted Match Score: 79%

SECTION E — FINAL RECOMMENDATION
| Field | Value |
|---|---|
| Direct Match Score | 72% |
| Adjusted Match Score (if applicable) | 81% |
| Overall Recommendation | HUMAN REVIEW |
`;
    expect(extractMatchScore(report)).toBe(81);
  });

  it("falls back to Direct when SECTION E adjusted is N/A (no adjustment applied)", () => {
    const report = `
2. DIRECT MATCH SCORE
   88%

SECTION E — FINAL RECOMMENDATION
| Field | Value |
|---|---|
| Direct Match Score | 88% |
| Adjusted Match Score (if applicable) | N/A |
| Overall Recommendation | ADVANCE |
`;
    expect(extractMatchScore(report)).toBe(88);
  });
});
