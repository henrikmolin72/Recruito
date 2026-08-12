// Deterministic prompt-injection heuristics on raw CV text. Only usable where we
// HAVE the text: .txt CVs. PDF text lives in compressed streams that only the
// model reads — the prompt-side SECURITY rule + INJECTION_CHECK marker cover that
// surface. ponytail: a high-precision pattern list, not a classifier — it catches
// marker spoofing and explicit override phrasings; a hit flags for human review
// (never blocks), so precision beats recall here. Upgrade path: server-side PDF
// text extraction if flagged PDFs ever become a real problem.
const PATTERNS: RegExp[] = [
  // Spoofing our machine-read markers
  /FINAL_MATCH_SCORE\s*:/i,
  /KEY_GAPS\s*:\s*\[/i,
  /INJECTION_CHECK\s*:/i,
  // Explicit override phrasings ("ignore all previous instructions", …)
  /(?:ignore|disregard|forget|override)\s+(?:all\s+|any\s+|the\s+)?(?:previous|prior|above|earlier|preceding)\s+(?:instructions|rules|prompts?)/i,
  // Addressing the evaluator ("you are an AI/assistant…") — CVs describe the
  // candidate, they do not address the reader as an AI.
  /\byou\s+are\s+(?:now\s+)?(?:an?\s+)?(?:ai|assistant|language\s+model|llm)\b/i,
  // Runs of zero-width characters — a hidden-text carrier. A lone one can be a
  // copy-paste artifact; require a run.
  /[​‌‍⁠﻿]{3,}/,
];

/** Returns the regex sources that matched — [] means no injection indicators. */
export function scanCvTextForInjection(text: string): string[] {
  if (!text) return [];
  return PATTERNS.filter((p) => p.test(text)).map((p) => p.source);
}
