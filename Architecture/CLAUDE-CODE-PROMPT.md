# CLAUDE CODE: Bygg rekryteringsmarknadsplats

Du ska bygga en fullständig rekryteringsmarknadsplats för den skandinaviska marknaden. Plattformen kopplar samman företag som behöver rekrytera med frilansande rekryterare/headhunters som tävlar om att hitta rätt kandidater.

## PROJEKTFILER

Alla specifikationer finns i `byggplan/`-mappen. Läs dem i ordning:

1. `00-MASTER-PLAN.md` — Översikt, filstruktur, roller, statusflöden, affärsregler
2. `01-PROJECT-SETUP.md` — Projektuppsättning, dependencies, konfiguration
3. `02-DATABASE-SCHEMA.md` — Supabase SQL-schema, RLS-policies, storage
4. `03-AUTH-SYSTEM.md` — Supabase Auth, klienter, middleware, hooks
5. `04-COMPANY-PORTAL.md` — Företagssidor: dashboard, jobb, kandidater
6. `05-RECRUITER-PORTAL.md` — Rekryterarsidor: jobb-browsing, mandat, kandidatpresentation
7. `06-JOB-SYSTEM.md` — Affärslogik: statusövergångar, mandatregler, placeringsflöde
8. `07-MESSAGING.md` — Realtidsmeddelanden med Supabase Realtime
9. `08-NOTIFICATIONS.md` — In-app + e-postnotifieringar via Resend
10. `09-PAYMENTS.md` — Stripe Connect: onboarding, fakturering, utbetalning
11. `10-ADMIN-PANEL.md` — Admin: godkännanden, KPI, utbetalningshantering
12. `11-SHARED-COMPONENTS.md` — Layout, navigation, landningssida, delade komponenter

## SNABBSAMMANFATTNING

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase + Stripe Connect + Resend

**Tre roller:** Company, Recruiter, Admin

**Kärnflöde:**
1. Företag publicerar jobb med lön + avgift (15% av årslön)
2. Rekryterare tar mandat (max 5 per jobb, max 5 aktiva per rekryterare)
3. Rekryterare presenterar kandidater (CV + kvalificering)
4. Företag granskar, intervjuar, anställer
5. Vid anställning → placering skapas → faktura skickas → betalning
6. Efter 90 dagars garanti → utbetalning till rekryterare (75% av avgiften)
7. Plattformen behåller 25%

**Affärsregler:**
- Max 5 rekryterare per jobb (first-come-first-served)
- Rekryterare måste godkännas av admin
- 90 dagars garantiperiod
- Avgift: 15% av årslön (konfigurerbart per jobb)
- Split: 25% plattform / 75% rekryterare

**Byggordning:** Följ steg 1→11 i ordning. Varje steg bygger på föregående.

## INSTRUKTIONER

- Börja med att läsa `00-MASTER-PLAN.md` noggrant
- Följ sedan steg 1-11 i ordning
- Varje fil innehåller exakta kodexempel — använd dem som grund
- All kod ska vara TypeScript
- Använd Server Components + Server Actions där möjligt
- Använd shadcn/ui för alla UI-komponenter
- Alla formulär: React Hook Form + Zod
- Texer i UI:t på svenska
- Design: Professionell nordisk minimalism, primärfärg #1B4F72, accent #27AE60
