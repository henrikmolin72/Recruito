"use server";

import { stripe } from "./client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getOrCreateStripeCustomer(companyId: string) {
  const supabaseAdmin = createAdminClient();

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("stripe_customer_id, company_name, billing_email")
    .eq("id", companyId)
    .single();

  if (!company) throw new Error("Company not found");

  if (company.stripe_customer_id) return company.stripe_customer_id;

  const customer = await stripe.customers.create({
    name: company.company_name,
    email: company.billing_email || undefined,
    metadata: { company_id: companyId },
  });

  await supabaseAdmin
    .from("companies")
    .update({ stripe_customer_id: customer.id })
    .eq("id", companyId);

  return customer.id;
}

export async function createConnectAccount(recruiterId: string, email: string) {
  const supabaseAdmin = createAdminClient();

  const account = await stripe.accounts.create({
    type: "express",
    country: "SE",
    email,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: "individual",
    metadata: { recruiter_id: recruiterId },
  });

  await supabaseAdmin
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
