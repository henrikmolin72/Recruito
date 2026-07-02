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
