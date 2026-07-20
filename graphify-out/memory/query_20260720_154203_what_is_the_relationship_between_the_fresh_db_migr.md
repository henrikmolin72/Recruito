---
type: "query"
date: "2026-07-20T15:42:03.507654+00:00"
question: "What is the relationship between the Fresh-DB Migration Chain Order Bug and the Determinism Bug (regex-parsed score flips run-to-run)?"
contributor: "graphify"
source_nodes: ["Fresh-DB Migration Chain Order Bug", "Determinism Bug: Regex-Parsed Score Flips Run-to-Run"]
---

# Q: What is the relationship between the Fresh-DB Migration Chain Order Bug and the Determinism Bug (regex-parsed score flips run-to-run)?

## Answer

Thematic rhyme only, not a real dependency — the AMBIGUOUS 0.15 tag is correct. Both are reproducibility bugs (same input, different outcome via hidden ordering/parsing) but live in unrelated subsystems: the migration bug is Postgres migration-chain ordering on a fresh local DB (Dev-Notes/local-supabase-stack-gotchas.md, fixed with 014/022 to_regclass guards), while the determinism bug is regex-parsing of free-form LLM markdown (docs/superpowers/plans/2026-07-02, fixed with the FINAL_MATCH_SCORE canonical marker + temperature 0). No shared code, files, or citations. The load-bearing pattern from the determinism side is instead its INFERRED semantically_similar_to edge to 'Problem: Regex-Masked Client Report Broken' (Decisions/2026-07-11) — the recurring 'regex over LLM output is fragile → emit a structured machine marker' family, fixed a third time on 2026-07-20 by the KEY_GAPS structured line.

## Source Nodes

- Fresh-DB Migration Chain Order Bug
- Determinism Bug: Regex-Parsed Score Flips Run-to-Run