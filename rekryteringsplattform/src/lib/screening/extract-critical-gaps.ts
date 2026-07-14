// Pulls a few "critical missing requirements" out of a screening-report markdown
// so the recruiter (in-form pre-submission self-check) sees Score + a handful of
// gaps WITHOUT the full report. The full report stays admin/recruiter-detail only.
//
// Source: the prompt's "3. KEY GAPS" section (evaluation-prompt.ts) — "What key
// JD elements are missing from the CV? (Short reply. Include approximate % weight
// of each gap.)". The model formats this freely (bullets, a small table, or
// prose), so this is a deliberate best-effort heuristic, not a strict parser.
// ponytail: heuristic parse with a known ceiling — if the report layout drifts we
// return [] and the UI just shows the score. Upgrade path: have the model emit a
// structured gaps block if this proves too lossy.

const MAX_GAPS = 4;
const MAX_LEN = 140;

// A line that starts a new section ends the KEY GAPS block.
const BOUNDARY =
  /^\s*(#{1,6}\s|\*{0,2}\d+\.\s|section\b|═{3,}|━{3,}|─{3,}|={3,}|-{3,}\s*$)/i;

function clean(s: string): string {
  return s
    .replace(/^[\s>*\-•|]+/, "") // leading bullet/table/quote marks
    .replace(/^\d+[.)]\s*/, "") // leading criterion numbers ("4. ") — client 14-07-06
    .replace(/[*_`]+/g, "") // markdown emphasis
    .replace(/\|/g, " ") // stray table pipes
    .replace(/^🔴\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractCriticalGaps(markdown: string): string[] {
  if (!markdown) return [];
  const lines = markdown.split("\n");

  // Find the KEY GAPS heading.
  const startIdx = lines.findIndex((l) => /key\s+gaps/i.test(l));
  if (startIdx === -1) return [];

  // Collect the block from the line after the heading until the next section.
  const block: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (BOUNDARY.test(lines[i])) break;
    block.push(lines[i]);
  }

  const isTableSeparator = (l: string) => /^[\s|:_-]+$/.test(l);
  const looksLikeHeaderRow = (l: string) =>
    /\b(gap|element|requirement|weight|missing|criteria)\b/i.test(l) &&
    !/\d/.test(l);

  const gaps: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    let v = clean(raw);
    if (!v || v.length < 3) return;
    // Drop rows that are pure punctuation/percentages with no description.
    if (!/[a-zA-Z]{3,}/.test(v)) return;
    if (/^(none|n\/?a|inga|ingen)\b/i.test(v)) return; // "None" → no gaps
    if (v.length > MAX_LEN) v = v.slice(0, MAX_LEN - 1).trimEnd() + "…";
    const key = v.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    gaps.push(v);
  };

  // Pass 1: bullets.
  for (const l of block) {
    if (gaps.length >= MAX_GAPS) break;
    if (/^\s*[-*•]\s+/.test(l)) push(l);
  }

  // Pass 2: table data rows (skip separators + the header row).
  if (gaps.length < MAX_GAPS) {
    for (const l of block) {
      if (gaps.length >= MAX_GAPS) break;
      if (!l.includes("|") || isTableSeparator(l) || looksLikeHeaderRow(l)) continue;
      // Take the first descriptive cell.
      const cell = l.split("|").map((c) => c.trim()).filter(Boolean)[0] || "";
      push(cell);
    }
  }

  // Pass 3: prose fallback — split remaining non-empty lines into clauses.
  if (gaps.length === 0) {
    const prose = block.join(" ").trim();
    for (const clause of prose.split(/[;\n]|(?:\.\s+)/)) {
      if (gaps.length >= MAX_GAPS) break;
      push(clause);
    }
  }

  return gaps.slice(0, MAX_GAPS);
}
