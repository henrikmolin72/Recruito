# STEG 3: Autentiseringssystem

## Instruktioner till Claude Code

Bygg autentisering med Supabase Auth + Next.js App Router. Tre roller: company, recruiter, admin.

---

## 3.1 Supabase Client Setup

### `src/lib/supabase/client.ts` (browser)
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### `src/lib/supabase/server.ts` (server components & actions)
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch { /* Server Component read-only */ }
        },
      },
    }
  );
}
```

### `src/lib/supabase/admin.ts` (service role — server only)
```typescript
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

### `src/lib/supabase/middleware.ts`
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users from dashboard routes
  if (!user && request.nextUrl.pathname.startsWith("/(dashboard)")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

### `middleware.ts` (root)
```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

---

## 3.2 Auth Hook

### `src/hooks/use-user.ts`
```typescript
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types/enums";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  // Company-specific
  company_id?: string;
  company_name?: string;
  // Recruiter-specific
  recruiter_id?: string;
  approval_status?: string;
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (!profile) { setLoading(false); return; }

      let extra: Partial<UserProfile> = {};

      if (profile.role === "company") {
        const { data: company } = await supabase
          .from("companies")
          .select("id, company_name")
          .eq("user_id", profile.id)
          .single();
        if (company) extra = { company_id: company.id, company_name: company.company_name };
      }

      if (profile.role === "recruiter") {
        const { data: recruiter } = await supabase
          .from("recruiters")
          .select("id, approval_status")
          .eq("user_id", profile.id)
          .single();
        if (recruiter) extra = { recruiter_id: recruiter.id, approval_status: recruiter.approval_status };
      }

      setUser({ ...profile, ...extra } as UserProfile);
      setLoading(false);
    }

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
```

---

## 3.3 Validerings-scheman

### `src/lib/validations/auth.ts`
```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ange en giltig e-postadress"),
  password: z.string().min(8, "Lösenordet måste vara minst 8 tecken"),
});

export const registerCompanySchema = z.object({
  email: z.string().email("Ange en giltig e-postadress"),
  password: z.string().min(8, "Lösenordet måste vara minst 8 tecken"),
  full_name: z.string().min(2, "Ange ditt namn"),
  company_name: z.string().min(2, "Ange företagsnamn"),
  org_number: z.string().optional(),
  industry: z.string().min(1, "Välj bransch"),
  city: z.string().min(1, "Ange stad"),
});

export const registerRecruiterSchema = z.object({
  email: z.string().email("Ange en giltig e-postadress"),
  password: z.string().min(8, "Lösenordet måste vara minst 8 tecken"),
  full_name: z.string().min(2, "Ange ditt namn"),
  headline: z.string().min(10, "Beskriv din expertis kort"),
  specializations: z.array(z.string()).min(1, "Välj minst en specialisering"),
  years_experience: z.number().min(0).max(50),
  linkedin_url: z.string().url("Ange en giltig LinkedIn-URL").optional().or(z.literal("")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;
export type RegisterRecruiterInput = z.infer<typeof registerRecruiterSchema>;
```

---

## 3.4 Sidor att bygga

### Registreringsflöde
1. `/register` — Välj roll (Företag eller Rekryterare) med två stora kort/knappar
2. `/register/company` — Formulär med fält från `registerCompanySchema`. Vid submit:
   - `supabase.auth.signUp()` med `options.data.role: "company"`
   - Insert i `companies`-tabellen
   - Redirect till `/company`
3. `/register/recruiter` — Formulär med fält från `registerRecruiterSchema`. Vid submit:
   - `supabase.auth.signUp()` med `options.data.role: "recruiter"`
   - Insert i `recruiters`-tabellen (status: pending)
   - Visa "Väntar på godkännande"-sida

### Login
4. `/login` — E-post + lösenord. Vid framgångsrik login, redirect baserat på roll:
   - company → `/company`
   - recruiter → `/recruiter`
   - admin → `/admin`

### Auth callback
5. `/callback/route.ts` — Hanterar e-postverifiering, redirect

### Design-riktlinjer
- Centered card layout (max-w-md)
- Logotyp ovanför formuläret
- "Har du redan konto? Logga in" / "Skapa konto" länkar
- Laddningsindikator på knappar
- Felmeddelanden med toast (sonner)

---

## Verifiering

- [ ] Kan registrera företagskonto → hamnar i `profiles` + `companies`
- [ ] Kan registrera rekryterarkonto → hamnar i `profiles` + `recruiters` (status: pending)
- [ ] Kan logga in och redirectas till rätt dashboard
- [ ] Oautentiserade användare redirectas till `/login`
- [ ] RLS fungerar — företag ser bara egna data

**Gå vidare till:** [04-COMPANY-PORTAL.md](./04-COMPANY-PORTAL.md)
