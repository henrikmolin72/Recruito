# STEG 1: Projektuppsättning

## Instruktioner till Claude Code

Skapa ett nytt Next.js-projekt med följande konfiguration. Kör alla kommandon i ordning.

---

## 1.1 Skapa projekt

```bash
npx create-next-app@latest rekryteringsplattform \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm
```

## 1.2 Installera dependencies

```bash
cd rekryteringsplattform

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# UI
npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast \
  @radix-ui/react-avatar @radix-ui/react-label @radix-ui/react-separator \
  @radix-ui/react-switch @radix-ui/react-popover @radix-ui/react-tooltip
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
npm install cmdk

# Forms & validation
npm install react-hook-form @hookform/resolvers zod

# Betalning
npm install stripe @stripe/stripe-js

# E-post
npm install resend

# Utilities
npm install date-fns
npm install sonner

# Dev
npm install -D supabase
npm install -D @types/node
```

## 1.3 Initiera shadcn/ui

```bash
npx shadcn@latest init
```

Välj:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Installera sedan komponenter:
```bash
npx shadcn@latest add button card dialog input select table badge tabs \
  textarea toast avatar dropdown-menu sheet label separator switch form \
  popover tooltip command sonner
```

## 1.4 Tailwind config

Ersätt `tailwind.config.ts` med:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EBF5FB",
          100: "#D6EAF8",
          200: "#AED6F1",
          300: "#85C1E9",
          400: "#5DADE2",
          500: "#2E86C1",
          600: "#1B4F72",
          700: "#154360",
          800: "#0E2F44",
          900: "#071B28",
        },
        success: {
          50: "#EAFAF1",
          500: "#27AE60",
          700: "#1E8449",
        },
        warning: {
          50: "#FEF9E7",
          500: "#F39C12",
          700: "#D68910",
        },
        danger: {
          50: "#FDEDEC",
          500: "#E74C3C",
          700: "#CB4335",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

## 1.5 Skapa .env.local

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Rekryto
```

## 1.6 Skapa utils

Skapa `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "SEK"): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatRelativeDate(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Idag";
  if (days === 1) return "Igår";
  if (days < 7) return `${days} dagar sedan`;
  if (days < 30) return `${Math.floor(days / 7)} veckor sedan`;
  return formatDate(date);
}

export function calculateFee(annualSalary: number, feePercentage: number = 15): {
  totalFee: number;
  platformFee: number;
  recruiterFee: number;
} {
  const totalFee = annualSalary * (feePercentage / 100);
  const platformFee = totalFee * 0.25;
  const recruiterFee = totalFee * 0.75;
  return { totalFee, platformFee, recruiterFee };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
```

## 1.7 Skapa typer

Skapa `src/types/enums.ts`:

```typescript
export enum UserRole {
  COMPANY = "company",
  RECRUITER = "recruiter",
  ADMIN = "admin",
}

export enum JobStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
  FILLED = "filled",
  CLOSED = "closed",
  CANCELLED = "cancelled",
}

export enum CandidateStatus {
  SUBMITTED = "submitted",
  REVIEWING = "reviewing",
  INTERVIEW = "interview",
  OFFERED = "offered",
  HIRED = "hired",
  GUARANTEE_PERIOD = "guarantee_period",
  COMPLETED = "completed",
  REJECTED = "rejected",
  DECLINED = "declined",
}

export enum PlacementStatus {
  CONFIRMED = "confirmed",
  INVOICE_SENT = "invoice_sent",
  PAYMENT_RECEIVED = "payment_received",
  GUARANTEE_ACTIVE = "guarantee_active",
  PAYOUT_RELEASED = "payout_released",
  GUARANTEE_FAILED = "guarantee_failed",
  REFUND_PROCESSING = "refund_processing",
}

export enum RecruiterApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  SUSPENDED = "suspended",
}

export const JOB_INDUSTRIES = [
  "IT & Tech",
  "Finans & Bank",
  "Life Science & Pharma",
  "Ingenjör & Industri",
  "Sälj & Marknad",
  "HR & Rekrytering",
  "Juridik",
  "Bygg & Fastighet",
  "Logistik & Supply Chain",
  "Hälsa & Sjukvård",
  "Utbildning",
  "Offentlig sektor",
  "Övrigt",
] as const;

export const JOB_LOCATIONS = [
  "Stockholm",
  "Göteborg",
  "Malmö",
  "Uppsala",
  "Linköping",
  "Örebro",
  "Västerås",
  "Umeå",
  "Remote (Sverige)",
  "Oslo",
  "Bergen",
  "Köpenhamn",
  "Remote (Norden)",
  "Övrigt",
] as const;

export const EMPLOYMENT_TYPES = [
  "Heltid",
  "Deltid",
  "Konsult",
  "Vikariat",
] as const;

export const MAX_RECRUITERS_PER_JOB = 5;
export const GUARANTEE_PERIOD_DAYS = 90;
export const DEFAULT_FEE_PERCENTAGE = 15;
export const PLATFORM_COMMISSION_PERCENTAGE = 25;
export const RECRUITER_COMMISSION_PERCENTAGE = 75;
```

---

## Verifiering

Efter detta steg ska du kunna köra:
```bash
npm run dev
```
Och se Next.js startsidan på `http://localhost:3000`.

**Gå vidare till:** [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md)
