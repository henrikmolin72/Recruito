# Compliance Gap Analysis — Recruito

**Date:** 2026-06-25
**Scope:** GDPR / Swedish DPA · EU Accessibility Act (WCAG 2.1 AA) · Swedish employment law (AI decisioning)
**Method:** Read-only static code audit (4 parallel agents + direct verification of load-bearing claims). No code changed.
**Codebase:** `rekryteringsplattform/`

---

## Verdict

Recruito has **strong security foundations** (auth, RLS, file handling) and **good compliance *infrastructure*** (privacy policy, data-rights UI, AI audit trail). The failures are in **enforcement and candidate-facing transparency** — the platform *documents* commitments it does not technically *keep*. Two of these are publish-blocking.

**Maturity estimate: ~65%.** Three publish-blockers + several high items below.

---

## Priority matrix

| # | Finding | Framework | Severity | Evidence |
|---|---------|-----------|----------|----------|
| 1 | 24-month candidate retention promised but **no enforcement** (no cron, no TTL, no `last_activity_at`) | GDPR Art. 5(1)(e) | **CRITICAL** | `vercel.json` crons = reminders + mandate-expiry only; `supabase/functions/` empty; policy line 81 |
| 2 | **No candidate-facing AI disclosure** — application form never says CV is AI-screened | GDPR Art. 13/14; EU AI Act Art. 13 | **CRITICAL** | `public-application-form.tsx` consent text (l.122-126); no notice in `/apply/[mandateId]` or candidate emails |
| 3 | Privacy policy says Anthropic gets **"ingen kontaktinformation"** — false; full CV (name/email/phone, maybe personnummer/photo) is sent | GDPR Art. 5(1)(a) accuracy/fairness | **HIGH** | `integritetspolicy/page.tsx:71` vs `api/screening-report` (full PDF), `api/screen` (cv_text+cover) |
| 4 | Personnummer / photo / demographic signal sent to US LLM; prompt-only mitigation, not enforced | Diskrimineringslagen; Schrems II | **HIGH** | `evaluation-prompt.ts:40` instruction only; PDF/CV text passed verbatim |
| 5 | Recruiter-submitted candidates have **no consent audit trail** (no `consent_given_at`/`consent_method`) | GDPR Art. 7(1) | **HIGH** | `candidates` table; Terms 5.1 requires consent but nothing stored |
| 6 | Candidate form error handling lacks `aria-live`/`role=alert`/`aria-invalid`; labels not `htmlFor`-associated | EU Accessibility Act / WCAG 3.3.1 | **HIGH** (candidate-facing) | `public-application-form.tsx:36-40, 44-57` |
| 7 | No DPA artifact in repo for any sub-processor (Anthropic, Supabase, Vercel, Resend) | GDPR Art. 28 | **MEDIUM** (verify off-repo) | Policy l.42 references DPA; none in codebase |
| 8 | No data-access logging on PII reads (CV view, application view) | GDPR Art. 5(2)/30 accountability | **MEDIUM** | `audit_log` covers financial/lifecycle only |
| 9 | Anthropic data-retention / SCC / DPIA undocumented | Schrems II; GDPR Art. 35 | **MEDIUM** | Policy l.75 mentions SCC; no DPIA, no ZDR confirmation |
| 10 | Privacy policy still in **draft** ("Version 1 — under external legal review") | GDPR Art. 12 | **MEDIUM** | `integritetspolicy` banner |
| 11 | Internal a11y: icon-only buttons w/o `aria-label`, focus outline removed w/o ring | WCAG 4.1.2 / 2.4.7 | **MEDIUM** | `candidate-chat.tsx:216`, `rich-text-editor.tsx:24`, `header.tsx:87` |
| 12 | No candidate-accessible explanation of AI evaluation outcome | EU AI Act Art. 13; GDPR Art. 15 | **MEDIUM** | Transparency card is recruiter-only |

---

## What is already GOOD (do not re-litigate)

- **Auth/AuthZ:** every mutating server action authenticates; `requireAdmin()` on admin paths; ownership checks via `getActorRoleForCandidateAction()`. No unauthenticated mutations found.
- **RLS:** enabled on candidates/messages/applications/placements; recursion bug fixed (057, SECURITY DEFINER helper).
- **File uploads:** private `cvs` bucket; magic-byte MIME validation; signed URLs (3600s); broad CV-read policy tightened (054).
- **Error hygiene:** Supabase errors logged server-side, generic messages to client. No schema leakage found.
- **AI human-in-the-loop:** all stage transitions require explicit human action — **Art. 22 (solely automated decision) likely NOT triggered**. AI score is advisory only.
- **AI audit trail:** `ai_audit_log` + `candidate_screenings` log model version, prompt hash, timestamp; 3-yr retention.
- **Bias controls:** prompt forbids protected attributes; bias-audit section; `ai_bias_reports` table.
- **Data-rights UI:** `exportMyData()` (Art. 15/20) + two-step erasure with `anonymize_candidate()` RPC preserving 7-yr accounting records.
- **Consent (public form):** explicit informed checkbox for candidates applying via public link.
- **Cookie consent:** granular banner (necessary vs analytics).

---

## Recommended remediation order

**Publish-blockers (do first):**
1. Implement retention enforcement — `last_activity_at` on candidates + monthly cron calling `anonymize_candidate()` for >24mo non-placement rows. (#1)
2. Add candidate AI disclosure — one line + privacy-link on the application form, and a sentence in the submission email. (#2)
3. Fix the privacy-policy misstatement (#3) — reword line 71 to reflect that CV text/files (incl. contact details, possibly personnummer) are sent; document mitigations.

**High (next sprint):**
4. Recruiter consent audit trail — migration adding `consent_given_at`/`consent_method` + form checkbox. (#5)
5. Candidate-form accessibility pass — `aria-live`/`role=alert` on errors, `aria-invalid`, `htmlFor`/`id` label association, `aria-required`. (#6)
6. Personnummer scrubbing before LLM send (regex strip) + decide policy on photo-bearing PDFs. (#4)

**Medium (backlog):** DPA artifacts in repo (#7), PII-read audit logging (#8), DPIA for Anthropic transfer + confirm ZDR (#9), finalize/ratify privacy policy (#10), internal a11y fixes (#11), candidate explanation channel (#12).

---

## Open questions needing off-repo documentation

- Executed **DPA + ZDR/no-train addendum with Anthropic** (commercial API doesn't train by default; ZDR materially shrinks #3/#9).
- Signed sub-processor DPAs: Supabase, Vercel, Resend.
- Any existing **DPIA** for the AI screening feature.
- Whether external legal review of the privacy policy is complete.
