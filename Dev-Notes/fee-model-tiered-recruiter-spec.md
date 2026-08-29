# Spec — Tiered recruiter fee (Sajid, 2026-08-28)

**Status:** IMPLEMENTED 2026-08-29 (formula + rounding + minimums + calculator, TDD). Decisions resolved per Henrik: A = mins at 0.7× client (table in §5); B = no lock-timing change (kept publication-time lock); C = tiers apply to exclusive; D = round-to-10 on both fees; E = min after rounding. Deferred: the static website "6%–7%" copy (Sajid is reviewing the site) and lock-timing Option (ii).
**Goal:** Replace the flat 7% recruiter fee with a guarantee-tiered fee (6% / 6.5% / 7%), plus round-to-nearest-10 and a recruiter minimum, per Sajid's proposal (based on 63 Hunteed data points, avg 6.58% / median 6.61%).

---

## 1. Current state (verified in code)

| Concern | Current implementation |
|---|---|
| Recruiter fee | `calculateRecruiterFee(salary)` = `floorToHundreds(salary * 0.07)` — **flat 7%**, floored to nearest 100, **no minimum** (`src/lib/utils.ts`) |
| Client fee | `calculateClientFee(salary, months, isExclusive, currency)` = `round(max(salary*(base + months*0.01), minFee))`; base 11% standard / 10% exclusive, +1%/guarantee-month → standard 11/12/13, exclusive 10/11/12 |
| Rounding | client = `Math.round` (nearest 1); recruiter = floor to 100 |
| Minimums | per-currency **client** `minFee` in `CURRENCY_CONFIG`; **no recruiter minimum** |
| Where fees live | `jobs.client_fee_amount` + `jobs.recruiter_fee_amount` (per-JOB, single value); `job_mandates` has **no** fee columns |
| Lock timing | fees locked on the job row at approval/publication (`jobs.ts`), before any recruiter accepts |
| Admin override | `updateRecruiterFeeAmount`, `updateClientFeeAmount`, fee-reconfirm flow — exists |
| Calculator | `recruitment-calculator.tsx` uses `RECRUITER_PCT = 0.07` flat (line 56); already has a 0/1/2-month guarantee selector |

> Note: Sajid's email says "current recruiter fee = 70% of client fee." That is **outdated** — the live code is flat **7% of salary**. On €100k: code = €7,000; his "70% of €11k" = €7,700. Worth telling him.

---

## 2. Target behaviour

### 2.1 Recruiter fee (the core change)
- **Tiered by guarantee period:** 0 months (0-day) = **6%**, 1 month (30-day) = **6.5%**, 2 months (60-day) = **7%** of annual base salary (`salary_max || salary_min`, unchanged).
- **Rounded to nearest 10, half-up.** `roundToTen(x) = Math.round(x / 10) * 10` reproduces Sajid's table exactly (435→440, 510→510, 524→520, 525→530, 526→530).
- **Minimum** applied after rounding: `fee = max(roundToTen(salary * pct), recruiterMinFee[currency])`. EUR min = **€2,450**.

### 2.2 Client fee
- **Percentages unchanged** (standard 11/12/13, exclusive 10/11/12).
- **Rounding changes** from nearest-1 to **nearest-10 half-up** (Sajid: "round client and recruiter fees to the nearest 10"). Client minimum unchanged (EUR €3,500, already in config).

### 2.3 Worked example (€100k salary, standard, per Sajid)
| Guarantee | Client fee % | Client pays | New recruiter fee (6/6.5/7%) | New Recruito revenue |
|---|---|---|---|---|
| 0-day | 11% | €11,000 | €6,000 | €5,000 |
| 30-day | 12% | €12,000 | €6,500 | €5,500 |
| 60-day | 13% | €13,000 | €7,000 | €6,000 |

Matches Sajid's table. (Recruito revenue = client fee − recruiter fee.)

---

## 3. What it should NOT do (scope guard)
- Do **not** change client-fee percentages (only their rounding).
- Do **not** remove the admin manual-override / fee-reconfirm flow (formula is a default, overridable before publication — Sajid confirms this exists).
- Do **not** recompute already-locked fees on existing jobs (locked column stays source of truth).
- Do **not** change currency handling (never convert between currencies; per-currency minimums only).
- Do **not** touch the guarantee-month model (0/1/2) or the exclusive/standard split.
- Do **not** expand into `PRICING_TIERS` (pricing.ts 12/13/15 by placement count) unless we confirm it actually feeds the fee — appears vestigial; verify during implementation.

---

## 4. Files to change
1. `src/lib/utils.ts` — add `RECRUITER_FEE_PCT_BY_GUARANTEE = [0.06, 0.065, 0.07]`; add `roundToTen`; rewrite `calculateRecruiterFee(salary, guaranteeMonths, currency)` (tier + roundToTen + min); switch `calculateClientFee` rounding to `roundToTen`. Remove `floorToHundreds` only if no other caller.
2. `src/lib/currency-config.ts` — add `recruiterMinFee` per currency (Decision A).
3. `src/lib/actions/jobs.ts:170` — pass `guaranteeMonths` + currency into `calculateRecruiterFee`.
4. `src/components/layout/recruitment-calculator.tsx` — recruiter fee tiered by the selected guarantee (reuse the shared `calculateRecruiterFee` instead of the local flat `RECRUITER_PCT`); Recruito-revenue line follows.
5. Marketing/i18n copy — recruiter-earnings statement "Earn approximately 6%–7% of annual base salary… Example: SEK 600,000 → SEK 36,000–42,000" (new/updated copy in all 4 dictionaries; exact placement in the recruiter-benefits section TBD with Sajid).
6. Tests (TDD) — `utils.test.ts`: tier at 0/30/60 → 6000/6500/7000 on €100k; Sajid's rounding table; min enforcement per currency; client-fee round-to-10. Calculator reflects the same.

---

## 5. Open decisions (need Henrik before build)

**A. Per-currency recruiter minimums.** EUR = €2,450 (given). Proposal: derive the rest as **0.7 × client minFee** (since 2,450/3,500 = 0.70):

| Currency | Client min (current) | Proposed recruiter min |
|---|---|---|
| EUR | 3,500 | **2,450** ✓ |
| SEK | 40,000 | 28,000 |
| NOK | 45,000 | 31,500 |
| DKK | 30,000 | 21,000 |
| GBP | 3,000 | 2,100 |
| USD | 4,000 | 2,800 |
| ISK | 550,000 | 385,000 |

→ Confirm these, or give exact figures.

**B. Lock timing (biggest scope driver).** Sajid: "locked once a recruiter accepts the mandate."
- **Option (i) — no change (recommended):** fee is already locked at publication, *before* any recruiter accepts, and doesn't change afterward. This already satisfies "locked before accept." Zero schema change.
- **Option (ii) — per-recruiter lock:** if admin re-negotiates the fee *after* publication and recruiters accept at different times, snapshot the fee per recruiter. Requires a migration (`job_mandates.recruiter_fee_amount`), snapshot in `claim_mandate`, and payout read-path changes. Bigger.

→ Which? (i) unless you re-negotiate fees mid-flight per recruiter.

**C. Recruiter tiers on exclusive roles.** Assume the 6/6.5/7% recruiter tier applies regardless of exclusive/standard (only the *client* fee differs for exclusive). Confirm.

**D. Client-fee rounding.** Sajid says round *both* client and recruiter to nearest 10. This changes the client fee rounding (nearest-1 → nearest-10). Confirm you want the client fee rounding changed too (vs. recruiter-only).

**E. Min-vs-round order.** `max(roundToTen(salary·pct), min)` — round first, then floor to the minimum. (Minimums are already multiples of 10, so no conflict.) Confirm.

---

## 6. Rollout
- Formula/rounding/min + calculator + copy = one PR, TDD, behind the existing admin-override (safe default).
- Lock-timing Option (ii), if chosen, = a separate follow-up PR (migration + payout paths).
- Website copy update coordinated with Sajid (he's reviewing the site tomorrow per his email).
