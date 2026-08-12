# 2026-08-12 — CV prompt-injection defense (flag-for-review, defense in depth)

**Context.** CVs (PDF/TXT) are sent verbatim to the screening model in the same
message as our instructions. An embedded instruction (visible or hidden text)
could inflate FINAL_MATCH_SCORE, poison the client-facing report, or spoof our
machine-read markers. The screening call has no tools, so blast radius was
already limited to report/score content.

**Decision.** Layered, no new dependencies:
1. Prompt: CV declared untrusted; model self-reports via `INJECTION_CHECK:
   CLEAN|SUSPECTED` marker; Section D gains an injection audit row; the client-
   report pass treats its inputs as data-not-instructions.
2. Deterministic: `FINAL_MATCH_SCORE` parse fixed to last-match-wins;
   `INJECTION_CHECK` parse last-match-wins; regex scan of `.txt` CVs (marker
   spoofing, override phrasings, zero-width runs); report renderer strips
   links/images.
3. Consequence: `candidate_screenings.injection_flagged` (migration 072) —
   flagged run never auto-writes `ai_match_score`; amber badge for admin +
   recruiter; company never sees the flag; audit log records flag + scan hits.

**Rejected.** Upload-time blocking (false positives on AI-engineer CVs —
flag-for-review instead); server-side PDF text extraction (heavy dep; model
self-check covers PDF text); second judge model call (2× cost — revisit if the
flag proves unreliable in `ai_audit_log`).

**Residual risk.** Model self-report is best-effort — a sufficiently strong
injection could suppress its own flag. Mitigated by the deterministic layers,
withheld auto-score being the only automated consequence, and human review
remaining in the loop for every client-visible decision.

**Follow-ups (Henrik).** Apply migration 072 to prod (SQL editor or
`supabase db push`); local verify blocked in the build session (Docker/OrbStack
not running).
