# STEG 5: Rekryterarportalen

## Instruktioner till Claude Code

Bygg alla vyer under `/recruiter/`. Kräver inloggad användare med role=recruiter.

---

## 5.1 Rekryterardashboard (`/recruiter`)

### Väntande godkännande
Om `approval_status !== 'approved'`, visa istället en status-sida:
- **pending:** "Din profil väntar på godkännande. Vi granskar vanligtvis inom 24 timmar."
- **rejected:** "Din ansökan avslogs. Kontakta oss om du har frågor."
- **suspended:** "Ditt konto har pausats. Kontakta support."

### Godkänd rekryterare — Dashboard
- **4 statistikkort:**
  - Aktiva mandat (antal av max)
  - Presenterade kandidater denna månad
  - Kandidater i intervju
  - Total intjänad provision (SEK)
- **Mina aktiva mandat** — Lista med jobb man har mandat för, med:
  - Jobbtitel, företag, bransch, plats
  - Antal kandidater presenterade
  - Deadline/senast ändrad
- **Senaste uppdateringar** — Statusändringar på kandidater (realtime)

---

## 5.2 Bläddra jobb (`/recruiter/jobs`)

### Jobbsökning med filter
- **Sökfält** (fritextsökning i titel + beskrivning)
- **Filter:**
  - Bransch (multi-select checkboxes)
  - Plats (multi-select)
  - Lönespann (range slider)
  - Avgift % (range)
  - Anställningstyp
  - Sortering: Senaste / Högst avgift / Minst konkurrens

### Jobbkort-komponent
```
┌──────────────────────────────────────────┐
│  🏢 TechCorp AB                         │
│                                          │
│  Senior Fullstack-utvecklare             │
│  📍 Stockholm  |  💼 IT & Tech          │
│  💰 650 000 - 800 000 SEK              │
│                                          │
│  Avgift: 15% (~105 000 kr)             │
│  Din andel: ~78 750 kr                  │
│                                          │
│  👥 3/5 rekryterare                     │
│  📅 Publicerad 3 dagar sedan            │
│                                          │
│  [Ta mandat]  [Läs mer →]              │
└──────────────────────────────────────────┘
```

### Viktiga regler att implementera
- **Visa inte jobb som har 5/5 rekryterare** (eller visa med "Fullt" badge)
- **Visa inte jobb man redan har mandat för** (eller visa med "Ditt mandat" badge)
- Visa beräknad rekryterarersättning baserat på lönespann

---

## 5.3 Jobbdetalj för rekryterare (`/recruiter/jobs/[id]`)

### Layout
- Full jobbbeskrivning, krav, önskemål
- Företagsprofil (kort, med logotyp)
- Lönespann + avgiftsberäkning
- Antal lediga mandat-platser
- **Knapp: "Ta mandat"** (framträdande CTA)
  - Bekräftelsedialog: "Du tar mandat för detta uppdrag. Du kan ha max 5 aktiva mandat."
  - Visa kvarvarande mandatplatser
  - Vid submit: INSERT i `job_mandates`

### Om man har mandat — extra sektion:
- **Presentera kandidat** (formulär, se 5.4)
- **Mina kandidater för detta jobb** (lista med status)

---

## 5.4 Presentera kandidat (formulär inom jobbdetalj)

### Kandidatformulär (`src/lib/validations/candidates.ts`)
```typescript
export const submitCandidateSchema = z.object({
  first_name: z.string().min(1, "Ange förnamn"),
  last_name: z.string().min(1, "Ange efternamn"),
  email: z.string().email("Ange giltig e-post").optional().or(z.literal("")),
  phone: z.string().optional(),
  linkedin_url: z.string().url().optional().or(z.literal("")),
  current_title: z.string().min(1, "Ange nuvarande titel"),
  current_company: z.string().optional(),
  years_experience: z.number().min(0),
  expected_salary: z.number().min(0).optional(),
  cover_note: z.string().min(20, "Skriv en kort presentation av kandidaten"),
  qualification_summary: z.string().min(20, "Beskriv varför kandidaten passar"),
  // CV-fil hanteras separat
});
```

### CV-uppladdning
```typescript
async function uploadCV(file: File, candidateId: string) {
  const ext = file.name.split(".").pop();
  const path = `${candidateId}/cv.${ext}`;
  await supabase.storage.from("cvs").upload(path, file);
  // Save path to candidates.cv_file_path
}
```

### Formulärlayout
- Delat i två kolumner på desktop:
  - Vänster: Kontaktinfo
  - Höger: Professionell info
- Under: Presentation (cover_note + qualification_summary)
- Under: CV-uppladdning (drag & drop + filväljare, max 10MB, PDF/DOC/DOCX)
- Submit-knapp: "Presentera kandidat"

### Vid submit
1. Validera formulär
2. Ladda upp CV till Storage
3. INSERT i `candidates` med status='submitted'
4. Skicka notifiering till företaget
5. Visa success-meddelande

---

## 5.5 Mina mandat (`/recruiter/mandates`)

### Lista aktiva mandat
- Jobbkort med status
- Antal kandidater presenterade per jobb
- Knapp: "Presentera kandidat" (snabblänk)
- Knapp: "Släpp mandat" (med bekräftelse)
- Max 5 aktiva mandat — visa räknare "3/5 mandat använda"

### Släpp mandat
- Bekräftelsedialog: "Är du säker? Du förlorar inte presenterade kandidater."
- UPDATE `job_mandates` SET `is_active = FALSE, released_at = NOW()`
- Decrement `jobs.current_recruiter_count`

---

## 5.6 Mina kandidater (`/recruiter/candidates`)

### Lista alla presenterade kandidater
- Filtrera på: Status, Jobb, Datum
- Sortera: Senaste, Status
- Varje rad: Kandidatnamn, Jobb, Företag, Status, Datum
- Status timeline/pipeline view (valfritt, nice-to-have)

---

## 5.7 Intäkter (`/recruiter/earnings`)

### Innehåll
- **Total intjänad** (alla avslutade placeringar)
- **Väntande utbetalning** (under garantiperiod)
- **Kommande utbetalningar** — lista med placeringar:
  - Kandidatnamn, företag, belopp, garantiperiod slutdatum
  - Countdown: "23 dagar kvar av garantiperiod"
- **Historik** — tidigare utbetalningar
- **Stripe Connect onboarding** — om inte slutförd, visa CTA för att slutföra
  - "Anslut ditt bankkonto för att ta emot utbetalningar"

---

## 5.8 Rekryterarprofil (`/recruiter/profile`)

### Redigerbara fält
- Namn, profilbild
- Headline (kort text)
- Bio (längre beskrivning)
- Specialiseringar (multi-select från JOB_INDUSTRIES)
- Platser (multi-select från JOB_LOCATIONS)
- År av erfarenhet
- LinkedIn-URL

### Stripe Connect onboarding
Om `stripe_connect_id` saknas:
```typescript
// Skapa Stripe Connect account
const account = await stripe.accounts.create({
  type: "express",
  country: "SE",
  email: user.email,
  capabilities: { transfers: { requested: true } },
});
// Save account.id to recruiters.stripe_connect_id

// Skapa onboarding-länk
const link = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${APP_URL}/recruiter/profile`,
  return_url: `${APP_URL}/recruiter/profile?stripe=success`,
  type: "account_onboarding",
});
// Redirect till link.url
```

---

## Design-riktlinjer för Recruiter-sidor
- Sidebar-navigation:
  - Dashboard (LayoutDashboard)
  - Bläddra jobb (Search)
  - Mina mandat (FileCheck)
  - Mina kandidater (Users)
  - Meddelanden (MessageSquare)
  - Intäkter (Wallet)
  - Profil (UserCircle)
- Grön accent för CTA-knappar (ta mandat, presentera)
- Mandat-räknare alltid synlig i sidebar eller header
- Jobb-kort med tydlig avgiftsberäkning
