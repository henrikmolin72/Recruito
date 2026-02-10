# STEG 9: Betalningssystem (Stripe Connect)

## Instruktioner till Claude Code

Implementera marketplace-betalningar. Plattformen = Stripe platform. Företag = Customers. Rekryterare = Connected Accounts (Express).

---

## 9.1 Stripe Setup

```typescript
// src/lib/stripe/client.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});
```

---

## 9.2 Rekryterare Stripe Connect Onboarding

### Skapa Connected Account (server action)
```typescript
// src/lib/stripe/actions.ts
"use server";
import { stripe } from "./client";

export async function createConnectAccount(recruiterId: string, email: string) {
  const account = await stripe.accounts.create({
    type: "express",
    country: "SE", // Ändra baserat på rekryterarens land
    email,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: "individual",
    metadata: { recruiter_id: recruiterId },
  });

  // Spara account.id till recruiters.stripe_connect_id
  const supabase = await createClient();
  await supabase
    .from("recruiters")
    .update({ stripe_connect_id: account.id })
    .eq("id", recruiterId);

  return account.id;
}

export async function createOnboardingLink(accountId: string) {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/recruiter/profile?stripe=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/recruiter/profile?stripe=success`,
    type: "account_onboarding",
  });
  return link.url;
}

export async function createLoginLink(accountId: string) {
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}
```

---

## 9.3 Företag som Stripe Customer

### Vid företagsregistrering eller första betalning
```typescript
export async function getOrCreateStripeCustomer(companyId: string) {
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("stripe_customer_id, company_name, billing_email")
    .eq("id", companyId)
    .single();

  if (company?.stripe_customer_id) return company.stripe_customer_id;

  const customer = await stripe.customers.create({
    name: company!.company_name,
    email: company!.billing_email,
    metadata: { company_id: companyId },
  });

  await supabase
    .from("companies")
    .update({ stripe_customer_id: customer.id })
    .eq("id", companyId);

  return customer.id;
}
```

---

## 9.4 Betalningsflöde vid placering

### Steg 1: Skapa faktura/betalning
```typescript
// src/app/api/payments/create-invoice/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const { placementId } = await req.json();

  // Hämta placement med alla relationer
  const { data: placement } = await supabaseAdmin
    .from("placements")
    .select(`
      *,
      companies(stripe_customer_id, company_name, billing_email),
      candidates(first_name, last_name),
      jobs(title)
    `)
    .eq("id", placementId)
    .single();

  if (!placement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customerId = placement.companies.stripe_customer_id;

  // Skapa Stripe Invoice
  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: 30,
    metadata: { placement_id: placementId },
  });

  // Lägg till fakturrad
  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    amount: placement.total_fee * 100, // Stripe vill ha öre
    currency: placement.salary_currency.toLowerCase(),
    description: `Rekryteringsavgift: ${placement.candidates.first_name} ${placement.candidates.last_name} — ${placement.jobs.title}`,
  });

  // Skicka fakturan
  await stripe.invoices.sendInvoice(invoice.id);

  // Uppdatera placement
  await supabaseAdmin
    .from("placements")
    .update({
      status: "invoice_sent",
      stripe_invoice_id: invoice.id,
      invoice_sent_at: new Date().toISOString(),
    })
    .eq("id", placementId);

  return NextResponse.json({ invoiceId: invoice.id });
}
```

### Steg 2: Webhook — betalning mottagen
```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const placementId = invoice.metadata?.placement_id;
      if (!placementId) break;

      await supabaseAdmin
        .from("placements")
        .update({
          status: "guarantee_active",
          payment_received_at: new Date().toISOString(),
        })
        .eq("id", placementId);

      // Notifiera rekryterare: betalning mottagen, garantiperiod startad
      break;
    }

    case "account.updated": {
      // Stripe Connect: rekryterare slutfört onboarding
      const account = event.data.object as Stripe.Account;
      if (account.charges_enabled && account.payouts_enabled) {
        await supabaseAdmin
          .from("recruiters")
          .update({ stripe_onboarding_complete: true })
          .eq("stripe_connect_id", account.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

### Steg 3: Utbetalning efter garantiperiod

**MVP: Manuellt via admin-panelen.**

```typescript
// src/app/api/payments/payout/route.ts
export async function POST(req: Request) {
  // Verifiera admin-roll
  const { placementId } = await req.json();

  const { data: placement } = await supabaseAdmin
    .from("placements")
    .select("*, recruiters(stripe_connect_id)")
    .eq("id", placementId)
    .single();

  if (!placement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (placement.status !== "guarantee_active") {
    return NextResponse.json({ error: "Not in guarantee period" }, { status: 400 });
  }
  if (new Date(placement.guarantee_end_date) > new Date()) {
    return NextResponse.json({ error: "Guarantee period not ended" }, { status: 400 });
  }

  // Skapa transfer till rekryteraren
  const transfer = await stripe.transfers.create({
    amount: placement.recruiter_fee * 100,
    currency: placement.salary_currency.toLowerCase(),
    destination: placement.recruiters.stripe_connect_id,
    metadata: { placement_id: placementId },
  });

  await supabaseAdmin
    .from("placements")
    .update({
      status: "payout_released",
      stripe_payout_id: transfer.id,
      payout_released_at: new Date().toISOString(),
    })
    .eq("id", placementId);

  // Notifiera rekryterare
  // Uppdatera recruiters.total_placements += 1

  return NextResponse.json({ transferId: transfer.id });
}
```

---

## 9.5 Stripe-config att komma ihåg

1. **Stripe Dashboard → Connect Settings:**
   - Aktivera Express accounts
   - Ställ in branding (logotyp, färger)
   - Lägg till Sverige, Norge, Danmark som länder

2. **Webhook endpoints att registrera:**
   - `https://yourdomain.se/api/webhooks/stripe`
   - Events: `invoice.paid`, `account.updated`, `payment_intent.succeeded`

3. **Valutor:** Stöd för SEK, NOK, DKK

**Gå vidare till:** [10-ADMIN-PANEL.md](./10-ADMIN-PANEL.md)
