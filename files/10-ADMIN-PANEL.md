# STEG 10: Admin-panel

## Instruktioner till Claude Code

Bygg alla vyer under `/admin/`. Kräver inloggad användare med role=admin. Alla queries kan använda `supabaseAdmin` (service role) för att kringgå RLS.

---

## 10.1 Admin Dashboard (`/admin`)

### Statistikkort (top row, 6 kort)
- Totala företag (antal)
- Totala rekryterare (godkända / väntande)
- Aktiva jobb
- Totala placeringar
- Total intäkt (plattformens andel, SEK)
- Genomsnittlig tid-till-anställning (dagar)

### Väntande godkännanden (prominent section)
- Lista rekryterare med `approval_status = 'pending'`
- Visa: Namn, headline, specialiseringar, LinkedIn, registrerad datum
- Knappar: ✅ Godkänn / ❌ Avslå
- Vid godkännande: uppdatera status + skicka e-post + notifiering

### Senaste aktivitet
- Activity log, senaste 20 poster
- Visa: Tidsstämpel, användare, action, entity

### Grafer (nice-to-have, kan vänta)
- Placeringar per månad (stapeldiagram)
- Intäkt per månad (linjediagram)

---

## 10.2 Rekryterare-hantering (`/admin/recruiters`)

### Tabell med alla rekryterare
Kolumner: Namn, E-post, Specialiseringar, Status, Betyg, Placeringar, Registrerad

### Filter
- Status (pending / approved / rejected / suspended)
- Specialisering
- Sök på namn

### Åtgärder per rekryterare
- **Godkänn** (pending → approved)
- **Avslå** (pending → rejected)
- **Suspendera** (approved → suspended)
- **Återaktivera** (suspended → approved)
- **Visa profil** (detaljvy)

### Godkännandeflöde
```typescript
export async function approveRecruiter(recruiterId: string) {
  const supabase = await createAdminClient();
  const adminUser = await getCurrentUser();

  await supabase.from("recruiters").update({
    approval_status: "approved",
    approved_at: new Date().toISOString(),
    approved_by: adminUser.id,
  }).eq("id", recruiterId);

  // Hämta rekryterarens user_id för notifiering
  const { data: recruiter } = await supabase
    .from("recruiters")
    .select("user_id")
    .eq("id", recruiterId)
    .single();

  await notify(recruiter!.user_id, "Du är godkänd!", "Välkommen! Du kan nu bläddra och ta mandat för jobb.", "/recruiter/jobs");
}
```

---

## 10.3 Företagshantering (`/admin/companies`)

### Tabell med alla företag
Kolumner: Företagsnamn, Kontakt, Org.nr, Stad, Verifierad, Aktiva jobb, Registrerad

### Åtgärder
- Verifiera (toggle `is_verified`)
- Visa detalj med alla jobb och placeringar

---

## 10.4 Jobbhantering (`/admin/jobs`)

### Tabell med alla jobb
Kolumner: Titel, Företag, Bransch, Plats, Status, Rekryterare, Kandidater, Skapad

### Filter
- Status
- Bransch
- Företag

### Åtgärder
- Pausa (active → paused)
- Stäng (→ closed)
- Visa detalj

---

## 10.5 Placeringar & Utbetalningar (`/admin/placements`)

### Tabell med alla placeringar
Kolumner: Kandidat, Jobb, Företag, Rekryterare, Lön, Total avgift, Platform-andel, Status, Garantiperiod

### Viktiga vyer (tabs eller filter)

**Tab: Under garantiperiod**
- Placeringar med `status = 'guarantee_active'`
- Visa countdown: dagar kvar
- Om garantiperiod passerad: markera i grönt med knapp "Frigör utbetalning"

**Tab: Redo för utbetalning**
- `guarantee_end_date <= today` AND `status = 'guarantee_active'`
- Knapp: "Frigör utbetalning" → triggar Stripe Transfer (se steg 9)
- Batch-utbetalning: "Betala alla" knapp

**Tab: Slutförda**
- Alla med `status = 'payout_released'`

**Tab: Problem**
- `guarantee_failed`, `refund_processing`

### Utbetalningsknapp
```typescript
async function handlePayout(placementId: string) {
  const res = await fetch("/api/payments/payout", {
    method: "POST",
    body: JSON.stringify({ placementId }),
  });
  if (res.ok) {
    toast.success("Utbetalning skickad!");
    // Refresh data
  } else {
    const err = await res.json();
    toast.error(err.error);
  }
}
```

---

## 10.6 Admin-navigation (sidebar)

- Dashboard (LayoutDashboard)
- Rekryterare (UserCheck) — med badge för pending count
- Företag (Building2)
- Jobb (Briefcase)
- Placeringar (Banknote)
- Inställningar (Settings)

**Gå vidare till:** [11-SHARED-COMPONENTS.md](./11-SHARED-COMPONENTS.md)
