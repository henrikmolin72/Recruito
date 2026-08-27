# 2026-08-27 — Multi-currency fee structure & per-currency minimums

## Decision

One calculator, seven currencies (SEK, NOK, DKK, ISK, EUR, GBP, USD), configured per currency — not converted from EUR.

1. **`src/lib/currency-config.ts` is the single source of truth**: per-currency `minSalary` (slider floor, UX only), `minFee` (economic backstop), `maxSalary`/`step` (slider display), symbol. Plus `Currency` type, `normalizeCurrency` (unknown → EUR), `clampSalaryToCurrency`, `formatMoney`.
2. **`calculateClientFee(salary, months, isExclusive, currency)` — currency is a required parameter.** A caller that forgets it is a compile error, never a silent EUR fallback. Fixes the pre-existing bug where a SEK job got a minimum fee of 3 500 SEK (~€310).
3. **Exclusive is its own flat rate: 10/11/12%** (standard 11/12/13%). The old ×0.9 multiplier (9.9/10.8/11.7) and all "discount" framing are gone — it is "an exclusive rate for exclusive roles".
4. **Formula:** `fee = max(salary × pct, minFee[currency])`. Minimum *salary* is never enforced server-side; the minimum *fee* protects the economics.
5. **Admin revenue is grouped per currency** (`revenueByCurrency`), rendered as "€X + Y SEK". Cross-currency sums are forbidden — one ISK placement would swamp every EUR figure.
6. **Currency switch clamps, never converts.** Switching EUR→ISK clamps the salary into ISK's range; no FX rates anywhere.
7. **Locked fees on existing jobs are untouched** — `client_fee_amount` on approved rows stays the source of truth; the new structure applies to new jobs only.

### Ride-along client fixes (same branch)
- **Industry lock**: job industry is fixed to the company's signup industry when canonical — enforced in `createJob`/`updateJob` (posted value ignored), disabled select in the UI. Legacy profiles without a canonical industry keep the editable picker.
- **🎉 Hired notification**: recruiter bell uses congratulatory copy (`notif.companyStageHiredTitle/Body`) — a branch inside the unified stage-move block, so it can never double-notify. Admin copy stays neutral.
- **Slider step 500** for EUR/GBP/USD (10 000 Scandi, 100 000 ISK) via the config map.

## Rejected alternatives
- **DB table for minimums** — YAGNI pre-revenue; values change by business decision a few times a year, a one-line code edit suffices.
- **FX conversion for revenue/switching** — new rate-source dependency, staleness/audit questions, fake precision.
- **UI-only industry disable** — a disabled select is cosmetic; the server must own the rule (CLAUDE.md §6 trust boundaries).

## Notes
- The recruiter tier system (`PRICING_TIERS` 15/13/12 in `pricing.ts`) is a separate fee system — deliberately untouched.
- `getEarningsAnalytics` (admin analytics page) still sums placement-level seed fees single-currency; known pre-existing limitation, out of scope here.
- Slider `maxSalary` values (3M Scandi / 30M ISK / 200k EUR·GBP / 300k USD) are display bounds chosen by us, not client-specified.

Tests: `src/lib/currency-config.test.ts` (37 table-driven cases mirroring the minimums table), `jobs-industry-lock.test.ts`, extended `admin-stats.test.ts` + `candidates-stage-notify.test.ts`.
