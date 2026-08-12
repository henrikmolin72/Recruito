// Parses the INJECTION_CHECK machine-read marker (evaluation-prompt.ts) out of a
// screening report. Last match wins, same rationale as KEY_GAPS/FINAL_MATCH_SCORE:
// the canonical line is emitted at the report's end, so an echo of injected text
// from the CV body must not win. Absent/malformed marker (every pre-2026-08
// report) => false: the flag is a best-effort review signal, never a gate that
// could invalidate old rows.
export function extractInjectionFlag(markdown: string): boolean {
  if (!markdown) return false;
  const matches = [...markdown.matchAll(/^\s*INJECTION_CHECK:\s*(CLEAN|SUSPECTED)\s*$/gim)];
  const last = matches[matches.length - 1];
  return last?.[1].toUpperCase() === "SUSPECTED";
}
