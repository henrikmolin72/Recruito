# BYGGPLAN: Rekryteringsmarknadsplats Skandinavien

## PROJEKTÖVERSIKT

En digital marknadsplats som kopplar samman rekryterande företag med frilansande rekryterare/headhunters i Skandinavien. Företag publicerar jobb, rekryterare tävlar om att hitta kandidater från sina nätverk, och plattformen tar kommission vid lyckad placering.

**Affärsmodell:** Företag betalar 15% av kandidatens årslön vid lyckad anställning. Plattformen behåller 25% (3,75% av årslön), rekryteraren får 75% (11,25% av årslön). 90 dagars garantiperiod.

---

## TECH STACK

| Lager | Teknologi | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 14+ |
| Språk | TypeScript | 5+ |
| Styling | Tailwind CSS + shadcn/ui | 3.4+ / latest |
| Backend/DB | Supabase (PostgreSQL) | latest |
| Auth | Supabase Auth | (ingår) |
| Realtime | Supabase Realtime | (ingår) |
| Fillagring | Supabase Storage | (ingår) |
| Betalning | Stripe Connect | latest |
| E-post | Resend | latest |
| Hosting | Vercel | latest |
| Validering | Zod | 3+ |
| Forms | React Hook Form + Zod | latest |

---

## BYGGORDNING

Följ dessa steg i ordning. Varje steg har en detaljerad specifikation i sin egen fil.

### Fas 1: Grundstruktur (Sprint 1)
1. **[01-PROJECT-SETUP.md](./01-PROJECT-SETUP.md)** — Skapa Next.js-projekt, installera dependencies, konfiguration
2. **[02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md)** — Supabase-schema, tabeller, RLS-policies, seed data
3. **[03-AUTH-SYSTEM.md](./03-AUTH-SYSTEM.md)** — Registrering, login, rollhantering (company/recruiter/admin)

### Fas 2: Kärnfunktioner (Sprint 2-3)
4. **[04-COMPANY-PORTAL.md](./04-COMPANY-PORTAL.md)** — Företagsprofil, jobbannonsering, kandidatgranskning
5. **[05-RECRUITER-PORTAL.md](./05-RECRUITER-PORTAL.md)** — Rekryterardashboard, mandathantering, kandidatpresentation
6. **[06-JOB-SYSTEM.md](./06-JOB-SYSTEM.md)** — Jobbflöde, filtrering, statushantering, max 5 rekryterare/jobb

### Fas 3: Kommunikation (Sprint 4)
7. **[07-MESSAGING.md](./07-MESSAGING.md)** — Realtidsmeddelanden, notifieringar, e-post
8. **[08-NOTIFICATIONS.md](./08-NOTIFICATIONS.md)** — In-app + e-postnotifieringar

### Fas 4: Betalning (Sprint 5)
9. **[09-PAYMENTS.md](./09-PAYMENTS.md)** — Stripe Connect, fakturering, escrow-flöde, utbetalning

### Fas 5: Admin & Polish (Sprint 6)
10. **[10-ADMIN-PANEL.md](./10-ADMIN-PANEL.md)** — Adminvy, godkännanden, KPI-dashboard
11. **[11-SHARED-COMPONENTS.md](./11-SHARED-COMPONENTS.md)** — Layout, navigation, gemensamma UI-komponenter

---

## FILSTRUKTUR

```
rekryteringsplattform/
├── .env.local                    # Miljövariabler (Supabase, Stripe, Resend)
├── .env.example                  # Mall för miljövariabler
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_functions.sql
│   │   └── 004_seed_data.sql
│   └── config.toml
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout med providers
│   │   ├── page.tsx                      # Landningssida
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── register/company/page.tsx
│   │   │   ├── register/recruiter/page.tsx
│   │   │   └── callback/route.ts         # Supabase auth callback
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                # Autentiserad layout med sidebar
│   │   │   │
│   │   │   ├── company/
│   │   │   │   ├── page.tsx              # Företagsdashboard
│   │   │   │   ├── profile/page.tsx      # Företagsprofil
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── page.tsx          # Lista jobb
│   │   │   │   │   ├── new/page.tsx      # Skapa jobb
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx      # Jobbdetalj + kandidater
│   │   │   │   │       └── edit/page.tsx
│   │   │   │   ├── candidates/
│   │   │   │   │   └── [id]/page.tsx     # Kandidatdetalj
│   │   │   │   ├── messages/page.tsx
│   │   │   │   └── billing/page.tsx
│   │   │   │
│   │   │   ├── recruiter/
│   │   │   │   ├── page.tsx              # Rekryterardashboard
│   │   │   │   ├── profile/page.tsx
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── page.tsx          # Bläddra tillgängliga jobb
│   │   │   │   │   └── [id]/page.tsx     # Jobbdetalj + presentera kandidat
│   │   │   │   ├── mandates/page.tsx     # Mina aktiva mandat
│   │   │   │   ├── candidates/
│   │   │   │   │   ├── page.tsx          # Mina presenterade kandidater
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── messages/page.tsx
│   │   │   │   └── earnings/page.tsx
│   │   │   │
│   │   │   └── admin/
│   │   │       ├── page.tsx              # Admin dashboard
│   │   │       ├── companies/page.tsx
│   │   │       ├── recruiters/page.tsx
│   │   │       ├── jobs/page.tsx
│   │   │       ├── placements/page.tsx
│   │   │       └── settings/page.tsx
│   │   │
│   │   └── api/
│   │       ├── webhooks/
│   │       │   └── stripe/route.ts       # Stripe webhooks
│   │       ├── payments/
│   │       │   ├── create-checkout/route.ts
│   │       │   └── payout/route.ts
│   │       └── email/
│   │           └── send/route.ts
│   │
│   ├── components/
│   │   ├── ui/                           # shadcn/ui komponenter
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   └── sheet.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   └── mobile-nav.tsx
│   │   │
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   ├── register-company-form.tsx
│   │   │   ├── register-recruiter-form.tsx
│   │   │   └── auth-provider.tsx
│   │   │
│   │   ├── jobs/
│   │   │   ├── job-card.tsx
│   │   │   ├── job-list.tsx
│   │   │   ├── job-form.tsx
│   │   │   ├── job-filters.tsx
│   │   │   └── job-status-badge.tsx
│   │   │
│   │   ├── candidates/
│   │   │   ├── candidate-card.tsx
│   │   │   ├── candidate-form.tsx
│   │   │   ├── candidate-status-pipeline.tsx
│   │   │   └── cv-upload.tsx
│   │   │
│   │   ├── messaging/
│   │   │   ├── message-list.tsx
│   │   │   ├── message-input.tsx
│   │   │   ├── conversation-list.tsx
│   │   │   └── message-thread.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── stats-card.tsx
│   │   │   ├── recent-activity.tsx
│   │   │   └── kpi-chart.tsx
│   │   │
│   │   └── shared/
│   │       ├── logo.tsx
│   │       ├── loading-spinner.tsx
│   │       ├── empty-state.tsx
│   │       ├── file-upload.tsx
│   │       ├── status-badge.tsx
│   │       └── pagination.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # Browser Supabase client
│   │   │   ├── server.ts                 # Server Supabase client
│   │   │   ├── middleware.ts             # Auth middleware
│   │   │   └── admin.ts                  # Service role client (server only)
│   │   │
│   │   ├── stripe/
│   │   │   ├── client.ts                 # Stripe client
│   │   │   └── actions.ts               # Stripe server actions
│   │   │
│   │   ├── email/
│   │   │   ├── client.ts                 # Resend client
│   │   │   └── templates.ts             # E-postmallar
│   │   │
│   │   ├── validations/
│   │   │   ├── auth.ts                   # Zod-scheman auth
│   │   │   ├── jobs.ts                   # Zod-scheman jobb
│   │   │   ├── candidates.ts            # Zod-scheman kandidater
│   │   │   └── company.ts               # Zod-scheman företag
│   │   │
│   │   └── utils.ts                      # Helpers (cn, formatCurrency, etc.)
│   │
│   ├── hooks/
│   │   ├── use-user.ts                   # Auth hook
│   │   ├── use-realtime.ts              # Supabase realtime hook
│   │   └── use-messages.ts              # Messaging hook
│   │
│   └── types/
│       ├── database.ts                   # Supabase generated types
│       ├── index.ts                      # App-specifika typer
│       └── enums.ts                      # Status-enums
│
├── public/
│   ├── logo.svg
│   └── og-image.png
│
└── middleware.ts                          # Next.js middleware (auth guard)
```

---

## MILJÖVARIABLER

```env
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Rekryto
```

---

## DESIGNSYSTEM

### Färger (Tailwind config)
- **Primary:** `#1B4F72` (Mörk blå) — professionell, nordisk
- **Primary Light:** `#D6EAF8`
- **Accent:** `#27AE60` (Grön) — success, CTA
- **Warning:** `#F39C12`
- **Danger:** `#E74C3C`
- **Grå bakgrund:** `#F8F9FA`
- **Text:** `#1A1A2E` (mörk)
- **Text muted:** `#6B7280`

### Typsnitt
- **Headings:** Inter (bold)
- **Body:** Inter (regular)

### Tone
- Professionell men varm
- Ren, minimalistisk nordisk design
- Mycket whitespace
- Tydliga CTAs

---

## ANVÄNDARROLLER & BEHÖRIGHETER

| Funktion | Company | Recruiter | Admin |
|----------|---------|-----------|-------|
| Skapa jobbannons | ✅ | ❌ | ✅ |
| Se alla jobb | Egna | Alla aktiva | Alla |
| Ta mandat | ❌ | ✅ | ❌ |
| Presentera kandidat | ❌ | ✅ | ❌ |
| Granska kandidater | ✅ (egna jobb) | ❌ | ✅ |
| Meddelanden | ✅ | ✅ | ✅ |
| Se betalningar | Egna | Egna intäkter | Alla |
| Godkänna rekryterare | ❌ | ❌ | ✅ |
| Systemöversikt | ❌ | ❌ | ✅ |

---

## STATUS-FLÖDEN

### Jobb-status
```
DRAFT → ACTIVE → FILLED → CLOSED
                → PAUSED → ACTIVE
                → CANCELLED
```

### Kandidat-status (per presenterad kandidat)
```
SUBMITTED → REVIEWING → INTERVIEW → OFFERED → HIRED → GUARANTEE_PERIOD → COMPLETED
                      → REJECTED
                                   → DECLINED
```

### Placering/Betalning
```
PLACEMENT_CONFIRMED → INVOICE_SENT → PAYMENT_RECEIVED → GUARANTEE_ACTIVE → PAYOUT_RELEASED
                                                       → GUARANTEE_FAILED → REFUND_PROCESSING
```

---

## VIKTIGA AFFÄRSREGLER

1. **Max 5 rekryterare per jobb** — first-come-first-served
2. **Rekryteraren äger kandidatdatan** — plattformen lagrar bara presentationen
3. **90 dagars garantiperiod** — om kandidaten slutar inom 90 dagar, ingen betalning till rekryterare
4. **Avgift: 15% av kandidatens årslön** — sätts av företaget vid annonsering
5. **Split: 25% plattform / 75% rekryterare** — efter Stripe-avgifter
6. **Rekryterare måste godkännas** av admin innan de kan ta mandat
7. **Företag verifieras** med organisationsnummer
8. **CV-filer raderas** 6 månader efter avslutad process (GDPR)
