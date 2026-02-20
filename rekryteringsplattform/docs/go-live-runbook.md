# Recruito Go-Live Runbook (Vercel + Supabase)

Den här runbooken är en praktisk körplan för produktion.
Stripe API + webhook hanteras separat.

## 1. Förbered domän och hosting

1. Sätt produktionsdomän i Vercel (ex: `app.recruito.se`).
2. Bekräfta att HTTPS är aktiv.
3. Lägg env vars i Vercel Production:
   - `NEXT_PUBLIC_APP_URL=https://app.recruito.se`
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
   - `SUPABASE_SERVICE_ROLE_KEY=...`

## 2. Supabase Auth-inställningar

I Supabase Dashboard:

1. `Authentication -> URL Configuration`
2. Sätt `Site URL` till exakt produktionsdomän.
3. Lägg till redirect URLs:
   - `https://app.recruito.se/callback`
   - `https://app.recruito.se/reset-password`

## 3. Kör migreringar i produktion

Kör följande migrationer i SQL Editor (i ordning om de inte redan är applicerade):

1. `supabase/migrations/005_add_paused_candidate_status.sql`
2. `supabase/migrations/006_ensure_paused_candidate_status.sql`
3. `supabase/migrations/007_harden_security_policies.sql`

## 4. Verifiera kritiska DB-regler

Kör dessa SQL-kontroller i produktion:

```sql
-- A) Verifiera att candidate_status innehåller 'paused'
select e.enumlabel
from pg_enum e
join pg_type t on t.oid = e.enumtypid
where t.typname = 'candidate_status'
order by e.enumsortorder;
```

```sql
-- B) Verifiera policy för notifications (insert endast service_role)
select policyname, cmd, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'notifications';
```

```sql
-- C) Verifiera policy för mandate claim (approved recruiters only)
select policyname, cmd, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'job_mandates'
order by policyname;
```

Förväntat:

1. `'paused'` finns i enum-listan.
2. `notifications` har insert-policy för service role.
3. `job_mandates` har insert-policy som kräver `approval_status = 'approved'`.

## 5. Deploy till production

1. Merge till huvudbranch.
2. Kör deploy i Vercel.
3. Bekräfta build green.
4. Verifiera att route-respons är OK:
   - `/`
   - `/login`
   - `/register`
   - `/forgot-password`
   - `/reset-password`
   - `/robots.txt`
   - `/sitemap.xml`

## 6. Smoke test (måste passera)

1. Företag kan registrera och logga in.
2. Rekryterare kan registrera och logga in.
3. Admin kan godkänna/avslå rekryterare.
4. Ej godkänd rekryterare kan inte claima mandat.
5. Godkänd rekryterare kan claima mandat.
6. Rekryterare kan presentera kandidat med CV.
7. Företag kan uppdatera kandidatstatus.
8. Chat fungerar i båda riktningar.
9. Notiser skapas och visas korrekt.
10. Lösenordsåterställning fungerar end-to-end.

## 7. Säkerhet och drift

1. Kontrollera att `SUPABASE_SERVICE_ROLE_KEY` bara finns server-side.
2. Bekräfta att `api/debug` inte är tillgänglig i production.
3. Aktivera error tracking (ex. Sentry).
4. Aktivera uptime-monitor + alerting.
5. Verifiera backup/PITR i Supabase.

## 8. Rollback-plan (minimum)

1. Om deploy felar: rollback till senaste fungerande Vercel deployment.
2. Om DB-policy orsakar driftstopp:
   - återskapa tidigare policy temporärt i SQL Editor
   - dokumentera exakt SQL som kördes
3. Frys nya deploys tills root cause är verifierad.

## 9. Efter release (första 24h)

1. Följ auth-fel i loggar.
2. Följ RLS/policy-fel i Supabase logs.
3. Följ mailleverans för reset/verify-länkar.
4. Testa första riktiga användarflöde live:
   - Signup -> godkännande -> claim -> kandidat -> statusändring.
