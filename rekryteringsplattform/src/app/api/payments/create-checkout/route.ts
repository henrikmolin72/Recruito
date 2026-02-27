import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateStripeCustomer } from "@/lib/stripe/actions";

export async function POST(req: Request) {
  try {
    // Verify the caller is the company that owns this placement
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { placementId } = await req.json();
    if (!placementId) {
      return NextResponse.json(
        { error: "placementId is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Fetch placement with relations
    const { data: placement, error: placementError } = await supabaseAdmin
      .from("placements")
      .select(
        `
        *,
        company:companies(id, stripe_customer_id, company_name, billing_email, user_id),
        candidate:candidates(first_name, last_name),
        job:jobs(title)
      `
      )
      .eq("id", placementId)
      .single();

    if (placementError || !placement) {
      return NextResponse.json(
        { error: "Placement not found" },
        { status: 404 }
      );
    }

    // Normalize joined data (Supabase may return array or object)
    const company = Array.isArray(placement.company)
      ? placement.company[0]
      : placement.company;
    const candidate = Array.isArray(placement.candidate)
      ? placement.candidate[0]
      : placement.candidate;
    const job = Array.isArray(placement.job)
      ? placement.job[0]
      : placement.job;

    if (!company) {
      return NextResponse.json(
        { error: "Company not found for placement" },
        { status: 404 }
      );
    }

    // Verify the calling user owns this company
    if (company.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow checkout for confirmed or invoice_sent placements
    if (
      placement.status !== "confirmed" &&
      placement.status !== "invoice_sent"
    ) {
      return NextResponse.json(
        { error: "Placement is not in a payable state" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer for the company
    const customerId = await getOrCreateStripeCustomer(company.id);

    const candidateName = candidate
      ? `${candidate.first_name} ${candidate.last_name}`
      : "Kandidat";
    const jobTitle = job?.title || "Uppdrag";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: (placement.salary_currency || "SEK").toLowerCase(),
            product_data: {
              name: `Rekryteringsavgift: ${candidateName}`,
              description: `Placering för ${jobTitle}`,
            },
            unit_amount: placement.total_fee * 100, // Stripe uses smallest currency unit (öre)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/company/billing?payment=success&placement=${placementId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/company/billing?payment=cancelled`,
      metadata: {
        placement_id: placementId,
        company_id: company.id,
      },
    });

    // Update placement with checkout session info
    await supabaseAdmin
      .from("placements")
      .update({
        status: "invoice_sent",
        stripe_payment_intent_id: session.id,
        invoice_sent_at: new Date().toISOString(),
      })
      .eq("id", placementId);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Create checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
