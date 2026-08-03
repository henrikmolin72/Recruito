# EU AI Act classification brief — for outside counsel

**Date:** 2026-08-03
**Author:** Engineering (not legal — no conclusion in this document is a legal determination)
**Purpose:** Give counsel the concrete facts needed to determine whether Recruito is a
*provider*, a *deployer*, or both, under Regulation (EU) 2024/1689 (the AI Act), for the
AI-assisted candidate screening feature. Companion to
[2026-08-03-ai-act-published-claims-must-match-code.md](2026-08-03-ai-act-published-claims-must-match-code.md).

**Why now:** the deadline for Annex III high-risk obligations to apply to employment AI
systems was 2 August 2026 — one day before this document was written. Recruito's screening
feature has been in production before that date.

Every factual claim below is a description of what the code does, with a file and line
reference so it can be re-verified. Nothing below should be read as "we have determined X" —
it is "here is what happens when the system runs; you determine what that means."

---

## 1. What the system does, end to end

**Trigger.** A recruiter or a Recruito admin initiates a screening for one candidate against
one job mandate — either as a recruiter self-check, or as Recruito's own (authoritative)
run. Entry point: `runCandidateEvaluation()` in
[run-evaluation.ts](../rekryteringsplattform/src/lib/screening/run-evaluation.ts).

**Input assembled.** The job description text, the job's evaluation config (target sector,
adjacent sectors, transferable skills, custom keywords), and the candidate's declared
employment status and years of experience are gathered server-side
([eval-data.ts](../rekryteringsplattform/src/lib/screening/eval-data.ts)). The candidate's CV
file is downloaded from private storage and hashed (SHA-256) for the audit trail
(`run-evaluation.ts:55-60`).

**What is sent to the model.** The CV file is sent to Anthropic's API **as the original
file, base64-encoded, unmodified** — not extracted text, not a redacted version:

```
run-evaluation.ts:94-95
  { type: "document", source: { type: "base64", media_type: mediaType, data: base64 } }
```

Whatever is in that PDF — including a photograph, date of birth, or any other detail the
candidate put in their own CV — reaches Anthropic's model. The accompanying prompt
([evaluation-prompt.ts](../rekryteringsplattform/src/lib/screening/evaluation-prompt.ts))
instructs the model to evaluate only professional qualifications and to disregard protected
characteristics. That is a natural-language instruction to the model, not a technical filter
— Recruito does not parse, redact, or verify what the model actually used.

**Model call.** `anthropic.messages.create()`, model name from `ANTHROPIC_MODEL` env var
(defaults to `claude-sonnet-4-6`), `temperature: 0` (`run-evaluation.ts:82-105`). This is a
standard Anthropic commercial API call — no fine-tuning, no custom-trained model, no model
Recruito itself built or trained. Recruito supplies the prompt and the document; Anthropic
supplies inference over its general-purpose model.

**Output.** The model returns free-text markdown: a match score (0–100), reasoning points,
and identified skill/experience gaps. A second API call
([client-report-prompt.ts](../rekryteringsplattform/src/lib/screening/client-report-prompt.ts))
rewrites this into a client-facing narrative report with no numeric score, for the hiring
company. Score and gaps are extracted from the first report via regex/parsing logic Recruito
wrote (`extract-match-score.ts`, `extract-critical-gaps.ts`) — this scoring/thresholding
logic is Recruito's own code, not something Anthropic provides.

**Decision authority.** The score is decision *support* only. Every stage transition a
candidate goes through (submitted → in review → interview → offer → hired, or any rejection)
requires an explicit human action by a recruiter or admin — the workflow state machine
(`getAllowedCandidateTransitions()` in
[candidate-workflow.ts:269](../rekryteringsplattform/src/lib/candidate-workflow.ts)) has no
path where an AI output alone changes a candidate's status. No code path exists where the AI
score triggers an automatic rejection or automatic advancement.

**Who controls the customer-visible score.** Only a Recruito admin run
(`setScore: true`) can write `ai_match_score` — the value the hiring company ultimately
sees. A recruiter's own self-check run (`setScore: false`) never writes it
([candidates-extended.ts:234-247](../rekryteringsplattform/src/lib/actions/candidates-extended.ts),
[candidates.ts:1007-1019](../rekryteringsplattform/src/lib/actions/candidates.ts)). Recruito,
not the client company and not the individual recruiter, controls what score — if any —
reaches the client.

---

## 2. Who does what, in plain terms

| Party | Role in this feature |
|---|---|
| **Recruito** | Wrote the evaluation prompt, the scoring/extraction logic, the report-generation logic, and the workflow rules. Decides when screenings run. Controls whether the customer-visible score is ever set. Presents the output to companies and recruiters as a Recruito product feature — the in-app page describes it as "Recruito uses AI (powered by Anthropic Claude)" ([ai-policy-content.tsx:28](../rekryteringsplattform/src/components/compliance/ai-policy-content.tsx)). |
| **Anthropic** | Supplies the underlying general-purpose AI model (Claude) via a commercial inference API. Recruito calls a standard `messages.create` endpoint; no custom training, no fine-tuning on Recruito's data is configured in the code. |
| **Client companies** (employers who post jobs) | Receive the output — the client-facing report and, when Recruito sets it, the match score. Cannot modify the prompt, the scoring logic, or how the system behaves. Make the actual hire/reject decision. |
| **Candidates** | Subject of the evaluation. As of the 2026-08-03 fix (companion ADR), informed before submitting that AI is used, with a link to an explanation and a stated right to contest. |
| **Recruiters** (Recruito's own or third-party) | Can trigger a self-check run of the same system on a candidate they represent, but cannot make it authoritative — see "who controls the score" above. |

---

## 3. The relevant Act provisions, as text (not interpretation)

Quoting the provisions engineering identified as directly relevant, for counsel to apply:

- **Annex III, point 4(a)** — AI systems intended to be used for recruitment or selection,
  in particular to place targeted job advertisements, analyse and filter job applications,
  and evaluate candidates, are classified high-risk.
- **Article 6(3)** — an Annex III system may be treated as not high-risk if it performs a
  narrow procedural task, improves a prior human activity's result, detects patterns in
  prior human decisions, or performs a purely preparatory task — **unless it performs
  profiling of natural persons**, in which case it is high-risk regardless. "Profiling"
  incorporates the GDPR Article 4(4) definition: automated processing of personal data to
  evaluate personal aspects, including work performance. Recruito's system scores and ranks
  candidates from their personal data (the CV) — engineering's reading is that this is
  profiling, so the Article 6(3) carve-out would not apply, but this is exactly the kind of
  determination counsel should confirm.
- **Article 3(3)** — "provider" means a natural or legal person that develops an AI system
  or has an AI system developed, and places it on the market or puts it into service under
  its own name or trademark.
- **Article 3(4)** — "deployer" means a natural or legal person using an AI system under
  its authority, except where the system is used in the course of a personal
  non-professional activity.
- **Article 25(1)(c)** — a distributor, importer, deployer, or other third party is
  considered a provider (and assumes provider obligations) where it modifies the intended
  purpose of an AI system, including a general-purpose AI system, not classified as
  high-risk in such a way that it becomes a high-risk AI system.
- **Articles 16–21** — provider obligations, in outline: conformity assessment procedure,
  EU declaration of conformity, CE marking, registration in the EU database, a quality
  management system, technical documentation (Article 11), and post-market monitoring.
- **Article 26** — deployer obligations, in outline: use the system per its instructions,
  ensure human oversight by trained personnel, monitor operation, inform affected persons
  (Art. 26(7)), keep automatically generated logs for at least six months (Art. 26(6)).

---

## 4. What engineering's reading is — and why it is not the final word

Based on the facts above, engineering's non-legal reading is that Recruito plausibly holds
**provider** obligations, not only deployer obligations: Recruito develops the system (the
prompt, scoring, and report logic are Recruito's own code) and offers its output to client
companies under Recruito's own branding, which maps to the Article 3(3) provider definition.
Anthropic's role — API-based inference over an unmodified general-purpose model — maps
against Article 25(1)(c): building a high-risk employment application on top of a
general-purpose model plausibly makes the builder (Recruito), not the model vendor
(Anthropic), the provider of the resulting high-risk system.

**This is not a conclusion counsel should defer to.** It is engineering's plain-language
reading of the text, offered so the question can be posed precisely rather than researched
from scratch. The classification determines which obligation set (16–21 vs. 26) applies, and
that in turn determines the size of the remaining work — so getting it right matters more
than getting it fast.

---

## 5. Specific questions for counsel

1. Is Recruito a provider, a deployer, or both, for this specific feature? (Recruito is
   plausibly also a deployer for the screenings it runs itself as "Recruito's own run" —
   see the `setScore: true` path in §1 — even if it is a provider with respect to the
   system's design.)
2. Does the Article 6(3) narrow-procedural-task exemption apply, or does the profiling
   carve-out in Recital 53 foreclose it, as engineering's reading suggests?
3. If provider obligations apply: which of Articles 16–21 are triggered now, and what is
   the minimum viable path (conformity assessment route, technical documentation scope,
   registration timeline)?
4. What is Anthropic's role for purposes of GPAI-model obligations under Chapter V, and does
   Recruito need anything from Anthropic beyond a standard commercial DPA (e.g., confirmation
   of zero data retention / no training on submitted content) to support its own compliance
   file?
5. Has Sweden designated and activated its Article 99 market surveillance authority, and
   what is the practical enforcement posture as of this feature's operation?
6. Is a DPIA required for this processing (it involves special-category-adjacent data risk
   given the unredacted CV transfer described in §1), and if so, what scope?
7. Given the Digital Omnibus package proposed November 2025 is not yet enacted, should
   Recruito plan against the current 2 August 2026 deadline, or is there a documented basis
   to expect enforcement forbearance in the interim?

---

## 6. What is explicitly NOT covered by this document

- Whether Recruito's current technical mitigations (human-in-the-loop, prompt instructions,
  audit logging — see the companion ADR) are *sufficient* for whichever obligation set
  applies. That depends on the answer to §5 question 1 and is a legal-and-engineering
  question to revisit once classification is settled.
- Sub-processor DPAs (Supabase, Vercel, Resend) and GDPR Article 28 documentation — a
  separate, GDPR-only workstream already tracked in
  [Work-Log/2026-06-25-compliance-gap-analysis.md](../Work-Log/2026-06-25-compliance-gap-analysis.md).
- Any jurisdiction outside the EU/EEA.
