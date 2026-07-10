import { describe, it, expect } from "vitest";
import { extractMatchScore, stripClientVisibleScores } from "./extract-match-score";

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

describe("stripClientVisibleScores — no raw % reaches the client report", () => {
  // ABSOLUTE assertion (not label-scoped): a passing scrub leaves NO digit-percent
  // anywhere. A label-scoped check would be tautological — it would only test the
  // formats the scrub already covers, and miss the free-prose leaks that matter.
  const anyPercent = (s: string) => /\d{1,3}\s*%/.test(s);

  it("drops the FINAL_MATCH_SCORE marker line entirely", () => {
    const out = stripClientVisibleScores("Summary text.\n\nFINAL_MATCH_SCORE: 88");
    expect(out).not.toMatch(/FINAL_MATCH_SCORE/);
    expect(out).toContain("Summary text.");
  });

  it("redacts labelled prose and table rows but keeps the surrounding text", () => {
    const out = stripClientVisibleScores(
      "Direct Match Score: 62%\nAdjusted Match Score: 81%\n| Direct Match Score | 72% |"
    );
    expect(anyPercent(out)).toBe(false);
    expect(out).toContain("Direct Match Score");
    expect(out).toContain("Adjusted Match Score");
  });

  // The leaking shapes both reviewers proved against the real prompt output — the
  // score appears in FREE PROSE, not next to a "Match Score" label. All must scrub.
  it.each([
    ["recruiter summary prose", "This candidate is an excellent fit, scoring 92% against the JD."],
    ["Q2 heading then prose answer", "2. DIRECT MATCH SCORE\n   The CV matches the JD to about 82%."],
    ["one-line rationale row", "| One-line rationale | Strong hire at 92% match |"],
    ["label far from number", "Direct Match Score assessment came out at 92%."],
    ["Overall Match phrasing", "Overall Match: 82%"],
    ["'scored' verb, no label", "The candidate scored 82% on direct match."],
    ["100% edge", "Perfect: 100% of must-haves met."],
    ["generic threshold prose", "- Direct ≥ 80% → ADVANCE\n- Direct < 65% → DECLINE"],
  ])("redacts the score in %s", (_name, input) => {
    expect(anyPercent(stripClientVisibleScores(input))).toBe(false);
  });

  it("scrubs a full SECTION E report while keeping recommendation words", () => {
    const report = `
SECTION E — FINAL RECOMMENDATION
| Direct Match Score | 72% |
| Adjusted Match Score (if applicable) | 81% |
| Overall Recommendation | HUMAN REVIEW |

FINAL_MATCH_SCORE: 81`;
    const out = stripClientVisibleScores(report);
    expect(anyPercent(out)).toBe(false);
    expect(out).not.toMatch(/\b81\b/); // the actual score never survives
    expect(out).toContain("HUMAN REVIEW");
  });

  it("leaves non-percentage numbers (years, counts) intact", () => {
    const out = stripClientVisibleScores("8 years of experience across 3 roles.");
    expect(out).toBe("8 years of experience across 3 roles.");
  });

  it("is a no-op on empty input", () => {
    expect(stripClientVisibleScores("")).toBe("");
  });
});

describe("stripClientVisibleScores — client-view polish (client request 2026-07-10)", () => {
  it("never leaves an orphan '—%' — masked percentages read as a plain dash", () => {
    const out = stripClientVisibleScores("The candidate scored 82% on direct match.");
    expect(out).not.toContain("—%");
    expect(out).toContain("—");
  });

  it("drops table rows whose value cell is fully masked instead of showing '| — |'", () => {
    const out = stripClientVisibleScores(
      "| Direct Match Score | 72% |\n| Overall Recommendation | ADVANCE |"
    );
    expect(out).not.toMatch(/Direct Match Score/);
    expect(out).toContain("ADVANCE");
  });

  it("drops masked rows that carry trailing flag cells too", () => {
    const out = stripClientVisibleScores("| Direct Match Score | 72% | ✅ Meets threshold |");
    expect(out.trim()).toBe("");
  });

  it("keeps rows whose value cell still carries words after masking", () => {
    const out = stripClientVisibleScores("| One-line rationale | Strong hire at 92% match |");
    expect(out).toContain("Strong hire at — match");
  });

  it("drops JD Match rows — they contradict the tier label once numbers are hidden", () => {
    const out = stripClientVisibleScores(
      "| JD Match — Direct | Partial |\n| Overall Recommendation | ADVANCE |"
    );
    expect(out).not.toMatch(/JD Match/i);
    expect(out).not.toMatch(/Partial/);
    expect(out).toContain("ADVANCE");
  });

  it("drops the Outcome Logic line — internal machinery is meaningless without numbers", () => {
    const out = stripClientVisibleScores(
      "Outcome Logic Applied: Direct Match Score ≥ 80% → ADVANCE. No deal-breakers.\nProbing is advisable."
    );
    expect(out).not.toMatch(/Outcome Logic/i);
    expect(out).toContain("Probing is advisable.");
  });
});
