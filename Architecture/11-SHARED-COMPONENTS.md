# STEG 11: Delade Komponenter & Landningssida

## Instruktioner till Claude Code

Bygg gemensam layout, navigation och landningssida.

---

## 11.1 Dashboard Layout (`src/app/(dashboard)/layout.tsx`)

### Struktur
```
┌───────────────────────────────────────────────┐
│  Header (logo, notifieringar, avatar-meny)    │
├──────────┬────────────────────────────────────┤
│          │                                    │
│ Sidebar  │  Main Content                      │
│          │  (children)                        │
│ - Item   │                                    │
│ - Item   │                                    │
│ - Item   │                                    │
│          │                                    │
│          │                                    │
└──────────┴────────────────────────────────────┘
```

### Header-komponent (`src/components/layout/header.tsx`)
- Logotyp (vänster)
- Sökfält (center, valfritt)
- Notifieringsklocka med badge (höger)
- Avatar med dropdown-meny:
  - Profilnamn + roll
  - Separator
  - Min profil
  - Inställningar
  - Separator
  - Logga ut

### Sidebar-komponent (`src/components/layout/sidebar.tsx`)
- Dynamisk baserat på `user.role`
- Aktiv sida markerad med färgad bakgrund
- Collapsed state på mobil (Sheet-komponent)
- Ikoner från lucide-react
- Mandat-räknare för rekryterare (t.ex. "3/5")
- Pending-badge för admin (antal väntande godkännanden)

```typescript
const COMPANY_NAV = [
  { label: "Dashboard", href: "/company", icon: LayoutDashboard },
  { label: "Jobb", href: "/company/jobs", icon: Briefcase },
  { label: "Kandidater", href: "/company/candidates", icon: Users },
  { label: "Meddelanden", href: "/company/messages", icon: MessageSquare },
  { label: "Fakturering", href: "/company/billing", icon: CreditCard },
  { label: "Profil", href: "/company/profile", icon: Building2 },
];

const RECRUITER_NAV = [
  { label: "Dashboard", href: "/recruiter", icon: LayoutDashboard },
  { label: "Bläddra jobb", href: "/recruiter/jobs", icon: Search },
  { label: "Mina mandat", href: "/recruiter/mandates", icon: FileCheck },
  { label: "Kandidater", href: "/recruiter/candidates", icon: Users },
  { label: "Meddelanden", href: "/recruiter/messages", icon: MessageSquare },
  { label: "Intäkter", href: "/recruiter/earnings", icon: Wallet },
  { label: "Profil", href: "/recruiter/profile", icon: UserCircle },
];

const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Rekryterare", href: "/admin/recruiters", icon: UserCheck },
  { label: "Företag", href: "/admin/companies", icon: Building2 },
  { label: "Jobb", href: "/admin/jobs", icon: Briefcase },
  { label: "Placeringar", href: "/admin/placements", icon: Banknote },
  { label: "Inställningar", href: "/admin/settings", icon: Settings },
];
```

### Mobile Navigation (`src/components/layout/mobile-nav.tsx`)
- Hamburger-knapp i header
- Öppnar Sheet (slide-in) med samma nav-items
- Stäng vid navigation

---

## 11.2 Delade UI-komponenter

### StatsCard (`src/components/dashboard/stats-card.tsx`)
```typescript
interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean }; // "+12% denna månad"
}
```

### StatusBadge (`src/components/shared/status-badge.tsx`)
Färgkodad badge baserat på status:
- submitted/pending → gul
- reviewing/active → blå
- interview → lila
- offered → orange
- hired/approved/completed → grön
- rejected/declined/cancelled → röd
- paused/suspended → grå

### EmptyState (`src/components/shared/empty-state.tsx`)
```typescript
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
}
// Exempel: "Inga jobb ännu", "Skapa din första jobbannons", [Skapa jobb →]
```

### FileUpload (`src/components/shared/file-upload.tsx`)
- Drag & drop zone
- Filväljare-knapp
- Visa vald fil med storlek
- Progressbar vid uppladdning
- Accepterade format som prop (PDF, DOC, DOCX)
- Max filstorlek som prop (10MB)

### Pagination (`src/components/shared/pagination.tsx`)
- Föregående / Nästa knappar
- Sidnummer
- "Visar 1-10 av 47 resultat"

### LoadingSpinner (`src/components/shared/loading-spinner.tsx`)
- Enkel spinner med valfri text
- Skeleton-varianter för kort och tabeller

---

## 11.3 Landningssida (`src/app/page.tsx`)

### Sektioner (top to bottom)

**1. Hero**
- Stor rubrik: "Rekrytera snabbare. Billigare. Bättre."
- Undertext: "Den skandinaviska marknadsplatsen som kopplar samman företag med de bästa frilansande rekryterarna."
- Två CTA-knappar: "Företag — Publicera jobb" / "Rekryterare — Börja tjäna"
- Bakgrund: mjuk gradient eller illustrativt mönster

**2. Så fungerar det (3 steg)**
- Steg 1: Företag publicerar → ikon + kort text
- Steg 2: Rekryterare hittar kandidater → ikon + kort text
- Steg 3: Betala vid framgång → ikon + kort text

**3. Fördelar för företag**
- Upp till 60% billigare än traditionella byråer
- Flera rekryterare jobbar parallellt
- Betala bara vid lyckad anställning
- 90 dagars garanti

**4. Fördelar för rekryterare**
- Fler uppdrag än du hinner med
- 75% av avgiften — mer än vad byråer betalar
- Jobba när och var du vill
- Bygg ditt rykte med betyg och recensioner

**5. Kalkylator-sektion**
- Interaktiv: Ange lön → visa besparing jämfört med traditionell byrå
- Visa "Företaget sparar X kr" och "Rekryteraren tjänar Y kr"

**6. Social proof (platshållare i MVP)**
- "Kommande — Gå med i väntelistan"
- Eller visa Hunted-liknande stats: "X företag, Y rekryterare"

**7. CTA-sektion**
- Upprepa CTAs: Registrera som företag / Registrera som rekryterare

**8. Footer**
- Logotyp
- Navigation: Om oss, Så fungerar det, Priser, Kontakt
- Juridik: Villkor, Integritetspolicy, GDPR
- Sociala medier-ikoner

### Design
- Ren, minimalistisk nordisk design
- Primärfärg `#1B4F72` för headings
- Grön `#27AE60` för CTAs
- Mycket whitespace
- Max-width container (~1200px)
- Responsiv (mobile-first)

---

## 11.4 Middleware — Route Protection

```typescript
// middleware.ts
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Skyddade routes
  const protectedPaths = ["/company", "/recruiter", "/admin"];
  const isProtected = protectedPaths.some((p) => path.startsWith(p));

  if (isProtected) {
    // Supabase middleware hanterar auth check
    // Ytterligare rollkontroll sker i layout.tsx
  }

  return response;
}
```

### Roll-kontroll i layout
```typescript
// src/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Kontrollera att användaren är på rätt sektion
  const path = /* get current path */;
  if (path.startsWith("/company") && profile.role !== "company") redirect(`/${profile.role}`);
  if (path.startsWith("/recruiter") && profile.role !== "recruiter") redirect(`/${profile.role}`);
  if (path.startsWith("/admin") && profile.role !== "admin") redirect(`/${profile.role}`);

  return (
    <div className="flex h-screen">
      <Sidebar role={profile.role} />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## DONE — Sammanfattning

När alla 11 steg är implementerade har du:
- ✅ Autentisering med tre roller
- ✅ Företag kan publicera jobb
- ✅ Rekryterare kan ta mandat och presentera kandidater
- ✅ Realtidsmeddelanden
- ✅ In-app + e-postnotifieringar
- ✅ Stripe Connect betalningsflöde
- ✅ Admin-panel för godkännande och utbetalning
- ✅ Landningssida
- ✅ Responsiv design

**Nästa steg efter MVP:** AI-matchning, mobilapp, multi-språk (NO/DK), avancerad analytics, automatiska utbetalningar via cron.
