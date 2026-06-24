---
type: "query"
date: "2026-06-14T19:31:09.076486+00:00"
question: "Where does the status-guard / DB-lock concurrency pattern recur, and is it applied consistently?"
contributor: "graphify"
source_nodes: ["Slots-cap atomicity rationale", "Status-guard race rationale", "Capacity gate (max_candidates) in claimMandate"]
---

# Q: Where does the status-guard / DB-lock concurrency pattern recur, and is it applied consistently?

## Answer

Inconsistent. Guarded atomically: claimMandate (claim_mandate RPC row-lock 053 + job_mandates_active_unique index 045), fee-reconfirm (pending_client_reconfirm status guard), interview rounds (one_active_round unique index 009). NOT guarded (check-then-insert in JS, no DB constraint): candidate submission cap at candidates.ts:221-231 and 1061 (same race class as the slots bug, for max_candidates per job), and duplicate-candidate detection at candidates.ts:260 / candidates-extended.ts:82 (soft-flag only, no unique index on job_id+identity). Neither is a security issue; the candidate-cap race mirrors the mandate slots bug fixed today.

## Source Nodes

- Slots-cap atomicity rationale
- Status-guard race rationale
- Capacity gate (max_candidates) in claimMandate