# Pilot-onboarding-runbook

**Version:** 1.0
**Senast uppdaterad:** 2026-05-14
**Målgrupp:** Admin (Henrik) som onboardar första pilotkund

Det här dokumentet beskriver hur du onboardar en pilotkund från första kontakt till första aktiva placering. Allt som inte är automatiserat under piloten är manuellt och ska följa stegen nedan.

---

## 0. Förutsättningar (en gång)

Innan första pilot startar:

- [ ] Recruito AB är registrerat hos Bolagsverket; org.nr finns
- [ ] `.env.example`-variabler är satta i Vercel production:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL=https://recruito.eu`
  - `CRON_SECRET` (rotation-strong random)
  - `RESEND_API_KEY` eller `SMTP_*`
  - `INTERNAL_REVIEW_EMAIL=henrik@recruito.eu` (eller den adress du vill ta emot rekryterar-signups på)
  - `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
  - `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL=claude-sonnet-4-6`
- [ ] Branch protection på `main` kräver check `Lint + Typecheck + Build` (PR [#5](https://github.com/henrikmolin72/Recruito/pull/5))
- [ ] Sentry-projekt skapat, test-exception verifierad
- [ ] Migrationer 034–040 körda på produktions-Supabase
- [ ] DPA-mall (`docs/legal/DPA-template-v1.md`) reviewed av jurist
- [ ] Pilotavtalsmall (`docs/legal/pilot-agreement-v1.md`) reviewed av jurist
- [ ] Bokföringssystem (Fortnox/Visma) konfigurerat för fakturering
- [ ] Bankuppgifter klara för utbetalning till rekryterare

---

## 1. Pre-launch (innan kunden skriver under)

### 1a. Första möte

Mål: avtala ramarna, sätt förväntningar, identifiera första uppdrag.

- [ ] Möte bokat (gärna 60 min, fysiskt eller video)
- [ ] Kund presenterad för plattformen — visa demo med ett dummy-jobb
- [ ] Pilot-status tydligt kommunicerad. Repetera de manuella delarna:
  - Fakturering sker via separat faktura (Fortnox), inte i plattformen
  - Garantibrott-återbetalning hanteras manuellt
  - SLA är best-effort, ingen kompensation
- [ ] Förväntad användning: 1–3 jobb under piloten, max X kandidater per jobb
- [ ] Kontaktperson hos kunden bekräftad (beslutsfattare, inte praktikant)
- [ ] Mötesanteckning skickad inom 24h

### 1b. Avtalspaket

- [ ] Pilotavtal genererat från `docs/legal/pilot-agreement-v1.md` (PDF, fyll i kundens uppgifter och prissättning)
- [ ] DPA bifogat som bilaga C till pilotavtalet
- [ ] Skicka via e-post med ditt eget signerade exemplar bifogat (visar good faith)
- [ ] Tidsfrist för signering: 14 dagar

### 1c. KYC av företaget

Innan kontot skapas:

- [ ] Slå upp kundens org.nr på allabolag.se eller Bolagsverket — verifiera firmatecknare matchar kontaktpersonens namn
- [ ] Verifiera kontaktpersonens e-postadress (domän matchar bolagets webbplats)
- [ ] Snabb googling: någon röd flagga? Förvaltarskap? Pågående konkurs?
- [ ] Anteckna i intern Notion/dokument

Stopp-kriterier: avslå pilot om något av följande:
- Pågående obeståndsförfarande
- Företaget < 6 månader gammalt utan etablerad omsättning
- Kontaktpersonens e-postadress kan inte verifieras mot bolaget

---

## 2. Onboarding-dag (när avtal är signerat)

### 2a. Skapa företagskontot

Plattformen tillåter företags-signup men för piloten skapar admin kontot manuellt så vi kan sätta rätt fält direkt.

```sql
-- I Supabase SQL editor, eller via admin-UI
-- Förbered: company_name, org_number, contact_email, contact_name
```

- [ ] Skapa user i Supabase Auth → role = `company` i `app_metadata`
- [ ] Skapa row i `profiles` → full_name, email, role
- [ ] Skapa row i `companies` → company_name, org_number, industry, user_id, `is_verified = true`
- [ ] Skicka inloggningslänk till kontaktpersonen via e-post med tillfälligt lösenord, instruera dem att byta direkt

### 2b. Onboarding-möte (30 min)

- [ ] Gå igenom plattformen tillsammans (skärmdelning)
- [ ] Visa: skapa jobb, hantera kandidater, kommunikation, statusövergångar
- [ ] Visa Settings → Mina data (PR [#9](https://github.com/henrikmolin72/Recruito/pull/9)) — kunden måste veta hur de utövar GDPR-rättigheter
- [ ] Visa cookie-banner om kunden inte sett det (PR [#7](https://github.com/henrikmolin72/Recruito/pull/7))
- [ ] Bekräfta att de hittar Användarvillkor och Integritetspolicy
- [ ] Sätt förväntan: incidenter rapporteras till dig direkt via Slack/SMS, inte ärendesystem

### 2c. Första jobbet

- [ ] Kunden skapar sitt första jobb i plattformen — du sitter bredvid (eller på video) första gången
- [ ] Granska jobbet innan publicering (status: `draft` → `active`)
- [ ] Tilldela rekryterare manuellt: identifiera 2–3 KYC-godkända rekryterare som matchar specialisering + region. Skapa `job_mandates`-rader.
- [ ] Maila utvalda rekryterare separat med kort bakgrund om kunden — varför de fick uppdraget

---

## 3. Drift (löpande under piloten)

### 3a. Dagliga check-ins (första veckan)

- [ ] Kort statusmail varje kväll: hur många kandidater, status på pågående, eventuella buggar
- [ ] Bekräfta att Sentry inte visar nya errors kopplade till kundens flöde
- [ ] Bekräfta att daglig cron `/api/guarantee/reminders` körs

### 3b. Kandidat-pipeline

När en kandidat presenteras:
- [ ] Du får notifikation (e-post + in-app)
- [ ] Granska kandidaten inom 24h (kvalitetskontroll medan piloten pågår — sluta gör detta när du litar på rekryterar-kvaliteten)
- [ ] Om allt OK, låt flödet rulla normalt

### 3c. Bekräftad placering

När `placements.status = 'confirmed'`:

1. **Fakturering (manuell)**
   - [ ] Öppna Fortnox/Visma
   - [ ] Skapa faktura: belopp = `placements.total_fee`, valuta = `placements.salary_currency`, netto 30
   - [ ] Bifoga sammanfattning av placeringen (kandidatens namn, jobbtitel, startdatum)
   - [ ] Skicka via e-post till kundens fakturaadress
   - [ ] Markera i plattformen: kör server-action `sendPlacementInvoice(placementId)` via admin-UI → status flippar till `invoice_sent`, `invoice_sent_at` sätts

2. **När betalning landat på Recruitos konto**
   - [ ] Markera i plattformen: status `invoice_sent → payment_received`, sätt `payment_received_at`
   - [ ] Status flippar automatiskt till `guarantee_active` när garantiperioden börjar

3. **Garantiperiodens slut (90 dagar default)**
   - [ ] Cron `/api/guarantee/reminders` skickar T-14 och T-7 påminnelser till kunden (verifiera att de mottagit)
   - [ ] Om inget garantibrott: status flippas automatiskt till `payout_released`. Manuellt: gör banköverföring till rekryterarens konto, belopp = `placements.recruiter_fee`. Markera utbetald.

4. **Garantibrott (om det inträffar)**
   - [ ] Kund rapporterar via `/api/guarantee/breach` (UI-flöde)
   - [ ] Du granskar inom 5 arbetsdagar
   - [ ] Beräknat återbetalningsbelopp (`refund_amount`) syns i admin-UI
   - [ ] Beslut: godkänn eller avslå → manuell kreditfaktura i Fortnox om godkänd
   - [ ] Markera i plattformen

### 3d. Eskalering

Bugg-rapport-flöde under piloten:
1. Kund pingar dig på Slack eller e-post
2. Du svarar inom 4 arbetsstimmar
3. Om kritisk bugg (data-förlust, säkerhet, otillgänglig): patch-fix samma dag, deploy direkt till prod (CI-gate hindrar trasig kod)
4. Om icke-kritisk: prioriteras i veckans backlog
5. Logga i `audit_log` om åtgärden påverkar kunddata

GDPR-incident (data-läcka eller misstänkt sådan):
- Inom 24h: bedöm omfattning, dokumentera fakta
- Inom 72h: anmäl till IMY om risk för rättigheter (mall: se Privacy Policy klausul 9)
- Direkt: informera berörd kund om hög risk
- Postmortem inom 7 dagar

---

## 4. Pilot-avslut (efter 6 månader eller på begäran)

- [ ] Möte med kunden 30 dagar innan pilotens slut — utvärdera, förhandla fortsättning
- [ ] Om kunden går vidare: nytt kommersiellt avtal (förhandlas separat)
- [ ] Om kunden avslutar: GDPR-radering av kundens konto enligt DPA klausul 8 (data återlämnas eller raderas inom 30 dagar)

---

## 5. Användbara länkar och commands

### Plattform
- Admin: https://recruito.eu/admin
- DSR-kö: https://recruito.eu/admin/data-rights
- Recruiters: https://recruito.eu/admin/recruiters
- Placements: https://recruito.eu/admin/placements
- Hälsokontroll: https://recruito.eu/api/health

### Tredjeparts-konsoler
- Supabase: https://supabase.com/dashboard
- Vercel: https://vercel.com/dashboard
- Sentry: https://sentry.io
- Resend: https://resend.com

### Snabbkommandon i Supabase SQL editor

Pending KYC-kö:
```sql
SELECT id, user_id, headline, created_at
  FROM recruiters
 WHERE approval_status = 'pending'
 ORDER BY created_at ASC;
```

Audit-trail för senaste sensitiva operationer:
```sql
SELECT * FROM audit_log ORDER BY performed_at DESC LIMIT 50;
```

Öppna DSR-förfrågningar:
```sql
SELECT * FROM data_rights_requests
 WHERE status IN ('pending', 'in_progress')
 ORDER BY created_at ASC;
```

Anonymisera en kandidat (kräver admin-user-id):
```sql
SELECT anonymize_candidate(
  '<candidate-uuid>',
  '<admin-uuid>',
  'GDPR Art. 17 på begäran av kandidaten 2026-XX-XX'
);
```

Manuell migrering till prod (efter test på staging):
```bash
# Från lokal miljö
cd rekryteringsplattform
npx supabase db push --linked
```

---

## 6. Saker som **inte** ska göras under piloten

Dessa är fortfarande backlog från Sprint A-planen — försök inte trolla fram dem manuellt:

- Stripe-integration (R1) — fakturering går via Fortnox under piloten
- Bolagsverket-API-integration (R3 företag) — manuell koll
- Automatiska tester på load-bearing paths (O4) — försiktig refaktor, inga "stora städningar" i `placements.ts`
- Resend bounce-handling (O7) — om en bounce sker, hantera manuellt
- WCAG AA-certifiering (Yellow) — kommunicera kring detta om pilot är skarp offentlig sektor

Om kunden ber om något som ligger i denna lista: säg "kommer i nästa version, hanteras manuellt under piloten" och dokumentera deras behov så det informerar prioritering efter piloten.

---

## 7. Sluttest-checklista (sista steg innan pilot-start)

Kör igenom denna när onboarding är klar och innan första jobbet publiceras:

- [ ] Kund kan logga in på recruito.eu
- [ ] Kund kan skapa, redigera och publicera ett jobb
- [ ] Kund kan se rekryterare som tilldelats jobbet
- [ ] Kund kan se inkommen kandidat och flytta i status-pipeline
- [ ] Kund kan kommunicera med rekryterare via meddelande-systemet
- [ ] Kund hittar Settings → Mina data och kan ladda ner export
- [ ] Cookie-banner fungerar; "Endast nödvändiga" rensar analytics-cookies
- [ ] Användarvillkor + Integritetspolicy laddar och visar v1-banner
- [ ] Sentry registrerar en simulerad exception från en /api/health-test-route
- [ ] `/api/health` returnerar 200 OK med supabase + email = ok
- [ ] Daglig cron-runda har gått (kolla logg)
- [ ] Backup-policy bekräftad i Supabase-konsolen (PITR enabled, 7d retention)

---

**Slut på pilot-onboarding-runbook.**

Frågor eller saker som behöver läggas till? Uppdatera detta dokument efter varje pilot — vad gick lätt, vad missade vi.
