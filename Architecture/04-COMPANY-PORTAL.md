# STEG 4: Företagsportalen

## Instruktioner till Claude Code

Bygg alla vyer under `/company/`. Kräver inloggad användare med role=company.

---

## 4.1 Företagsdashboard (`/company`)

### Innehåll
- Välkomstmeddelande med företagsnamn
- **4 statistikkort** i en rad:
  - Aktiva jobb (antal)
  - Presenterade kandidater (antal)
  - Pågående intervjuer (antal)
  - Lyckade placeringar (antal)
- **Senaste kandidaterna** — lista med de 5 senaste presenterade, med status-badge
- **Aktiva jobb** — lista med de 5 senaste, med antal rekryterare per jobb

### Data att hämta
```typescript
// Aktiva jobb för detta företag
const { data: jobs } = await supabase
  .from("jobs")
  .select("*, candidates(count)")
  .eq("company_id", companyId)
  .in("status", ["active", "paused"])
  .order("created_at", { ascending: false })
  .limit(5);

// Senaste kandidaterna
const { data: candidates } = await supabase
  .from("candidates")
  .select("*, jobs!inner(company_id, title), recruiters(user_id, profiles:user_id(full_name))")
  .eq("jobs.company_id", companyId)
  .order("submitted_at", { ascending: false })
  .limit(5);
```

---

## 4.2 Företagsprofil (`/company/profile`)

### Formulär-fält
- Företagsnamn (text)
- Organisationsnummer (text)
- Beskrivning (textarea, markdown stöds)
- Bransch (select)
- Webbplats (url)
- Stad (text)
- Land (select: SE, NO, DK)
- Antal anställda (select: 1-10, 11-50, 51-200, 201-500, 500+)
- Logotyp (filuppladdning → Supabase Storage `logos/`)
- Fakturerings-e-post (email)
- Faktureringsadress (textarea)

### Logotypuppladdning
```typescript
async function uploadLogo(file: File, companyId: string) {
  const ext = file.name.split(".").pop();
  const path = `${companyId}/logo.${ext}`;
  const { data, error } = await supabase.storage
    .from("logos")
    .upload(path, file, { upsert: true });
  // Save public URL to companies.logo_url
}
```

---

## 4.3 Skapa jobbannons (`/company/jobs/new`)

### Formulär-fält (använd `src/lib/validations/jobs.ts`)

```typescript
export const createJobSchema = z.object({
  title: z.string().min(3, "Ange en jobbtitel"),
  description: z.string().min(50, "Beskriv tjänsten mer detaljerat"),
  requirements: z.string().min(20, "Ange krav för tjänsten"),
  nice_to_have: z.string().optional(),
  industry: z.string().min(1, "Välj bransch"),
  location: z.string().min(1, "Välj plats"),
  employment_type: z.string().default("Heltid"),
  remote_policy: z.string().optional(),
  salary_min: z.number().min(0).optional(),
  salary_max: z.number().min(0).optional(),
  fee_percentage: z.number().min(5).max(25).default(15),
  max_recruiters: z.number().min(1).max(10).default(5),
});
```

### Layout
- Steg-för-steg wizard ELLER single-page form med sektioner
- Sektioner:
  1. **Grundinfo** — Titel, bransch, plats, anställningstyp
  2. **Beskrivning** — Tjänstebeskrivning, krav, meriterande
  3. **Lön & Avgift** — Lönespann, avgiftsprocent med kalkylator som visar:
     - "Företagets kostnad: X kr"
     - "Rekryterarens ersättning: Y kr"
     - "Jämfört med traditionell byrå (25%): Z kr — Du sparar W kr"
  4. **Inställningar** — Max rekryterare, remote policy
- Knapp: "Spara som utkast" och "Publicera"

### Avgifts-kalkylator (inline komponent)
```
┌──────────────────────────────────────────┐
│  Avgiftskalkylator                       │
│                                          │
│  Lönespann: 500 000 - 700 000 SEK       │
│  Din avgift: 15%                         │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Vid 600 000 SEK:                  │  │
│  │ Total avgift: 90 000 kr           │  │
│  │ Rekryteraren får: 67 500 kr       │  │
│  │                                    │  │
│  │ Traditionell byrå (25%): 150 000  │  │
│  │ 💰 Du sparar: 60 000 kr          │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## 4.4 Jobbdetalj (`/company/jobs/[id]`)

### Layout (tabs)
- **Tab: Översikt** — Jobbinfo, status, publicerat datum
- **Tab: Kandidater** — Lista alla presenterade kandidater med:
  - Namn, nuvarande titel
  - Rekryterarens namn
  - Status-badge (color-coded)
  - Knapp: Ändra status (dropdown: Reviewing → Interview → Offered → Hired / Rejected)
  - Knapp: Visa CV (öppna PDF)
  - Knapp: Skicka meddelande till rekryteraren
- **Tab: Rekryterare** — Vilka rekryterare som har mandat, deras betyg
- **Tab: Meddelanden** — Konversationer kopplade till detta jobb

### Status-ändring på kandidat
När företag ändrar status till "Hired":
1. Visa dialog: "Bekräfta anställning"
   - Fyll i: Faktisk årslön, Startdatum
   - Beräkna avgift automatiskt
2. Skapa placement-record
3. Uppdatera jobb-status till "filled"
4. Skicka notifiering till rekryteraren
5. Trigga betalningsflöde (Steg 9)

---

## 4.5 Kandidatdetalj (`/company/candidates/[id]`)

### Innehåll
- Kandidatens information (namn, titel, företag, erfarenhet)
- CV-fil (PDF viewer eller download-länk)
- Rekryterarens kvalificeringssammanfattning
- Rekryterarens anteckningar
- Status-historik (timeline)
- Knappar: Ändra status, Skicka meddelande

---

## 4.6 Fakturering (`/company/billing`)

### Innehåll
- Stripe Customer Portal länk (för att hantera betalmetoder)
- Lista placeringar med status och belopp
- Fakturor (datum, belopp, status: väntande/betald)
- Total kostnad hittills

---

## Design-riktlinjer för Company-sidor
- Sidebar-navigation med ikoner (Lucide):
  - Dashboard (LayoutDashboard)
  - Jobb (Briefcase)
  - Kandidater (Users)
  - Meddelanden (MessageSquare)
  - Fakturering (CreditCard)
  - Profil (Building2)
- Breadcrumbs på alla undersidor
- Responsiv tabell för kandidater och jobb
- Empty states med illustration och CTA
