// Extracts a 0-100 match score from a screening-report markdown so the admin
// candidate queue can show an "AI Match %". The evaluation prompt emits a
// "Direct Match Score" and, when an adjacent-sector adjustment applies, an
// "Adjusted Match Score". We prefer the Adjusted figure (the final score) and
// fall back to the Direct one. Returns null when neither is present/parseable —
// the caller leaves ai_match_score untouched in that case.
// Canonical machine-readable score the prompt is instructed to emit as its
// LAST line ("FINAL_MATCH_SCORE: NN"). Extracting this instead of parsing prose
// removes the Adjusted-vs-Direct ambiguity that made the same CV score
// differently run-to-run (client report 2026-07-02). Falls back to the legacy
// prose regex for reports generated before the marker existed.
function canonicalScore(markdown: string): number | null {
  const m = markdown.match(/FINAL_MATCH_SCORE:\s*(\d{1,3})\s*%?/i);
  if (!m) return null;
  const value = Number(m[1]);
  return value >= 0 && value <= 100 ? value : null;
}

export function extractMatchScore(markdown: string): number | null {
  if (!markdown) return null;

  const canonical = canonicalScore(markdown);
  if (canonical !== null) return canonical;

  // Each label appears multiple times in a real report (the transferable-skills
  // section AND the final SECTION E summary table). SECTION E is the canonical
  // figure and comes last, so take the LAST valid (0-100) occurrence of each
  // label rather than the first. label, then up to 20 non-digit chars
  // (": ", " | ", " → ", " (if applicable) | "), then 1-3 digits + %.
  const lastScore = (label: string): number | null => {
    const re = new RegExp(`${label}[^\\d]{0,20}(\\d{1,3})\\s*%`, "gi");
    let result: number | null = null;
    for (const m of markdown.matchAll(re)) {
      const value = Number(m[1]);
      if (value >= 0 && value <= 100) result = value;
    }
    return result;
  };

  return lastScore("Adjusted Match Score") ?? lastScore("Direct Match Score");
}

// Redacts the candidate's raw match percentage from a report before it is shown
// to the CLIENT (client request 2026-07-02: clients see a tier label, not a
// number). Recruiters/admin keep the full report (this is never applied to their
// views — see getLatestEvaluation).
//
// The report is free-text LLM prose: the score turns up as a labelled row, on its
// own line, in a recruiter summary ("scoring 92% against the JD"), in the one-line
// rationale, etc. A denylist of a few labelled formats CANNOT hold against that
// (security review 2026-07-02), so we redact EVERY 0–100 percentage. In an
// evaluation report every %-figure is a score / relevance / weight the client is
// not meant to see anyway, which also matches the client's "no raw percentages"
// intent. Non-% numbers (years, counts) are untouched.
export function stripClientVisibleScores(markdown: string): string {
  if (!markdown) return markdown;
  return markdown
    // Machine marker line ("FINAL_MATCH_SCORE: NN") — drop the whole line.
    .replace(/^.*FINAL_MATCH_SCORE:\s*\d{1,3}\s*%?.*$/gim, "")
    // Machine marker line ("KEY_GAPS: [...]") — drop the whole line.
    .replace(/^.*KEY_GAPS:\s*\[.*$/gim, "")
    // Internal screening machinery reads as a contradiction once the numbers
    // are hidden ("JD Match — Partial" next to "Overall Recommendation —
    // ADVANCE"; "Outcome Logic Applied: ≥ — → ADVANCE") — drop those lines
    // for the client view (client request 2026-07-10).
    .replace(/^.*JD Match.*$/gim, "")
    .replace(/^.*Outcome Logic.*$/gim, "")
    // "Human Review Recommended: NO — Reason: score of — meets…" is internal
    // machinery that alarmed the client (report 2026-07-11, image 6) — drop the
    // flag line. The "| Overall Recommendation | HUMAN REVIEW |" value stays
    // (2026-07-10 decision: recommendation words survive).
    .replace(/^.*Human Review Recommended.*$/gim, "")
    // Every 0–100 percentage → dash. Denylist-proof: no labelled format
    // required. Plain "—", not "—%" (client request 2026-07-10).
    .replace(/\b(?:100|\d{1,2})\s*%/g, "—")
    // A table row whose value cell got fully masked carries no information —
    // drop the row instead of rendering "| Direct Match Score | — |".
    .replace(/^\s*\|[^|\n]*\|\s*—\s*(\|[^\n]*)?$/gim, "")
    // Collapse the blank lines left by the dropped lines.
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}
