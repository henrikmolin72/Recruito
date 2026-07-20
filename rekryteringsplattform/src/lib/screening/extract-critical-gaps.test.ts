import { describe, it, expect } from "vitest";
import { extractCriticalGaps } from "./extract-critical-gaps";

describe("extractCriticalGaps", () => {
  it("returns [] when there is no KEY GAPS section", () => {
    expect(extractCriticalGaps("## SECTION A\n1. JD MATCH\nYes.")).toEqual([]);
    expect(extractCriticalGaps("")).toEqual([]);
  });

  it("parses a bulleted KEY GAPS block and stops at the next section", () => {
    const md = `### 2. DIRECT MATCH SCORE
80%

### 3. KEY GAPS
- No PLC programming experience (20% weight)
- Missing textile/production machinery exposure (10%)
- Limited team-leadership evidence (5%)

### 4. YEARS OF PROFESSIONAL EXPERIENCE
3 years 1 month`;
    const gaps = extractCriticalGaps(md);
    expect(gaps).toEqual([
      "No PLC programming experience (20% weight)",
      "Missing textile/production machinery exposure (10%)",
      "Limited team-leadership evidence (5%)",
    ]);
    // Must not bleed into section 4.
    expect(gaps.join(" ")).not.toMatch(/YEARS|3 years/);
  });

  it("parses a table-formatted KEY GAPS block, skipping header + separator rows", () => {
    const md = `## 3. KEY GAPS
| Missing Element | Weight |
|---|---|
| PLC / control systems depth | 20% |
| Safety compliance certification | 15% |

## SECTION B`;
    const gaps = extractCriticalGaps(md);
    expect(gaps).toEqual(["PLC / control systems depth", "Safety compliance certification"]);
  });

  it("returns [] when the candidate has no gaps (\"None\")", () => {
    const md = `### 3. KEY GAPS
None — the CV meets all core JD requirements.

### 4. NEXT`;
    expect(extractCriticalGaps(md)).toEqual([]);
  });

  it("caps the result at four gaps", () => {
    const md = `### 3. KEY GAPS
- gap one alpha
- gap two beta
- gap three gamma
- gap four delta
- gap five epsilon
### 4. NEXT`;
    expect(extractCriticalGaps(md)).toHaveLength(4);
  });

  it("falls back to prose clauses when there are no bullets or tables", () => {
    const md = `### 3. KEY GAPS
The CV lacks formal PLC certification; there is no evidence of safety compliance training.
### 4. NEXT`;
    const gaps = extractCriticalGaps(md);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0].toLowerCase()).toContain("plc");
  });

  it("strips markdown emphasis and truncates very long items", () => {
    const long = "x".repeat(200);
    const md = `### 3. KEY GAPS\n- **${long}**\n### 4. NEXT`;
    const gaps = extractCriticalGaps(md);
    expect(gaps[0]).not.toContain("*");
    expect(gaps[0].length).toBeLessThanOrEqual(140);
    expect(gaps[0].endsWith("…")).toBe(true);
  });

  it("drops numbered criterion-title bullets, still stripping numbers from real gaps (14-07-06, superseded 2026-07-20)", () => {
    // Superseded 2026-07-20: criterion titles are parser artifacts/model
    // noise, never real gaps (evaluation-prompt.ts explicitly forbids the
    // model emitting them as gap lines) — CRITERION_TITLES drops them even
    // when correctly inside the KEY GAPS bullet block. Number-stripping still
    // applies to a genuine numbered gap bullet.
    const md = [
      "3. KEY GAPS",
      "- 1. No PLC programming experience (20%)",
      "- 4. Years of Professional Experience (20%)",
      "- 5. Current Employment Status (15%)",
      "- 6. Short-Term Positions (10%)",
      "- 7. Overqualification (5%)",
    ].join("\n");
    expect(extractCriticalGaps(md)).toEqual(["No PLC programming experience (20%)"]);
  });

  it("does not corrupt decimal numbers at the start of a gap", () => {
    const md = [
      "3. KEY GAPS",
      "- 3.5 years of Kubernetes experience required (10%)",
    ].join("\n");
    expect(extractCriticalGaps(md)).toEqual([
      "3.5 years of Kubernetes experience required (10%)",
    ]);
  });

  it("does not surface criterion-title table rows as gaps (table-format report, client bug 2026-07-20)", () => {
    // Section A rendered as ONE table: rows start with "|", never match the
    // BOUNDARY regex, so rows 4/5 leak into the Key Gaps block and pass 2
    // harvested "Years of Professional Experience" / "Current Employment
    // Status" as false gaps.
    const md = `## SECTION A — CORE SCREENING

| # | Criterion | Result |
|---|---|---|
| 1. JD Match — Direct | Partial |
| 2. Direct Match Score | 90% |
| 3. Key Gaps | - No explicit mention of manufacturing sector experience (~10%) - No formal continuous improvement methodology cited (~5%) |
| 4. Years of Professional Experience | 7 years 2 months |
| 5. Current Employment Status | Employed — Baltic Supply Solutions AB (Apr 2021–Present) |
| 6. Short-Term Positions | 0 |
| 7. Overqualification | No |
`;
    const gaps = extractCriticalGaps(md);
    expect(gaps.join(" ")).not.toMatch(/years of professional experience/i);
    expect(gaps.join(" ")).not.toMatch(/current employment status/i);
    expect(gaps.join(" ")).not.toMatch(/short-term positions/i);
    expect(gaps.join(" ")).not.toMatch(/overqualification/i);
    // Trade-off accepted: the real gaps live inside row 3's cell and are lost
    // in this layout — [] (score only) beats false gaps. New reports use the
    // structured KEY_GAPS line (Task 2) and never hit this path.
  });

  it("prefers the structured KEY_GAPS line over the heuristic", () => {
    const md = `### 3. KEY GAPS
- Stale heuristic line that must be ignored

KEY_GAPS: ["No manufacturing sector experience (~10%)", "No formal CI methodology cited (~5%)"]
FINAL_MATCH_SCORE: 90`;
    expect(extractCriticalGaps(md)).toEqual([
      "No manufacturing sector experience (~10%)",
      "No formal CI methodology cited (~5%)",
    ]);
  });

  it("returns [] for KEY_GAPS: [] without falling back to the heuristic", () => {
    const md = `### 3. KEY GAPS
- Must not appear

KEY_GAPS: []
FINAL_MATCH_SCORE: 95`;
    expect(extractCriticalGaps(md)).toEqual([]);
  });

  it("falls back to the heuristic when KEY_GAPS is malformed JSON", () => {
    const md = `### 3. KEY GAPS
- Real heuristic gap (10%)

KEY_GAPS: [broken
FINAL_MATCH_SCORE: 80`;
    expect(extractCriticalGaps(md)).toEqual(["Real heuristic gap (10%)"]);
  });

  it("filters criterion titles even out of the structured line", () => {
    const md = `KEY_GAPS: ["Current Employment Status", "No forklift certification (~10%)"]`;
    expect(extractCriticalGaps(md)).toEqual(["No forklift certification (~10%)"]);
  });

  it("takes the LAST KEY_GAPS line when the marker appears more than once", () => {
    const md = `KEY_GAPS: []

### 3. KEY GAPS
- ignored

KEY_GAPS: ["Real gap (~10%)"]
FINAL_MATCH_SCORE: 80`;
    expect(extractCriticalGaps(md)).toEqual(["Real gap (~10%)"]);
  });

  it("falls back to the heuristic when KEY_GAPS matches but is not valid JSON", () => {
    // "[broken]" matches the line regex but JSON.parse throws — the catch branch.
    const md = `### 3. KEY GAPS
- Real heuristic gap (10%)

KEY_GAPS: [broken]
FINAL_MATCH_SCORE: 80`;
    expect(extractCriticalGaps(md)).toEqual(["Real heuristic gap (10%)"]);
  });
});
