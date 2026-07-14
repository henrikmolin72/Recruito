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

  it("strips leading criterion numbers from gap lines (client 14-07-06)", () => {
    const md = [
      "3. KEY GAPS",
      "- 4. Years of Professional Experience (20%)",
      "- 5. Current Employment Status (15%)",
      "- 6. Short-Term Positions (10%)",
      "- 7. Overqualification (5%)",
    ].join("\n");
    expect(extractCriticalGaps(md)).toEqual([
      "Years of Professional Experience (20%)",
      "Current Employment Status (15%)",
      "Short-Term Positions (10%)",
      "Overqualification (5%)",
    ]);
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
});
