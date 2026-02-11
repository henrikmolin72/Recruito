"use server";

import { createClient } from "@/lib/supabase/server";
import { getStripe } from "./client";

export async function createConnectAccount(
  recruiterId: string,
  email: string
): Promise<string> {
  const account = await getStripe().accounts.create({
    type: "express",
    country: "SE",
    email,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: "individual",
    metadata: {
      recruiter_id: recruiterId,
    },
  });

  const supabase = await createClient();
  await supabase
    .from("recruiters")
    .update({ stripe_connect_id: account.id })
    .eq("id", recruiterId);

  return account.id;
}

export async function createOnboardingLink(
  accountId: string
): Promise<string> {
  const link = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/recruiter/earnings?refresh=true`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/recruiter/earnings?onboarding=complete`,
    type: "account_onboarding",
  });

  return link.url;
}

export async function createLoginLink(accountId: string): Promise<string> {
  const link = await getStripe().accounts.createLoginLink(accountId);
  return link.url;
}

export async function getOrCreateStripeCustomer(
  companyId: string
): Promise<string> {
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("stripe_customer_id, company_name, billing_email, user_id")
    .eq("id", companyId)
    .single();

  if (!company) {
    throw new Error("Företaget hittades inte");
  }

  // Return existing customer if available
  if (company.stripe_customer_id) {
    return company.stripe_customer_id;
  }

  // Look up the profile email as fallback
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", company.user_id)
    .single();

  const customer = await getStripe().customers.create({
    name: company.company_name,
    email: company.billing_email || profile?.email || undefined,
    metadata: {
      company_id: companyId,
    },
  });

  await supabase
    .from("companies")
    .update({ stripe_customer_id: customer.id })
    .eq("id", companyId);

  return customer.id;
}
