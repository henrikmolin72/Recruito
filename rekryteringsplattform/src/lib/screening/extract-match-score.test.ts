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

  it("prefers the canonical FINAL_MATCH_SCORE marker over prose scores", () => {
    const md = `Direct Match Score: 76%\nAdjusted Match Score: 67%\n\nFINAL_MATCH_SCORE: 42`;
    expect(extractMatchScore(md)).toBe(42);
  });

  it("reads the marker with a percent sign and surrounding whitespace", () => {
    expect(extractMatchScore("blah\n\nFINAL_MATCH_SCORE:  50 %\n")).toBe(50);
  });

  it("is stable regardless of Adjusted-vs-Direct prose wording when the marker is present", () => {
    const a = `Adjusted Match Score: N/A\nDirect Match Score: 67%\nFINAL_MATCH_SCORE: 40`;
    const b = `Adjusted Match Score: 75%\nDirect Match Score: 70%\nFINAL_MATCH_SCORE: 40`;
    expect(extractMatchScore(a)).toBe(extractMatchScore(b));
  });

  it("falls back to prose scores when no marker is present (legacy reports)", () => {
    expect(extractMatchScore("Direct Match Score: 80%")).toBe(80);
  });

  it("ignores out-of-range marker values and falls back", () => {
    expect(extractMatchScore("FINAL_MATCH_SCORE: 250\nDirect Match Score: 55%")).toBe(55);
  });

  it("returns null when neither marker nor prose score exists", () => {
    expect(extractMatchScore("no score here")).toBeNull();
  });
});
