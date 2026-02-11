import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { getOrCreateStripeCustomer } from "@/lib/stripe/actions";

export async function POST(request: NextRequest) {
  try {
    const { placementId } = await request.json();

    if (!placementId) {
      return NextResponse.json(
        { error: "placement_id krävs" },
        { status: 400 }
      );
    }

    // Fetch placement with relations
    const { data: placement, error: placementError } = await getSupabaseAdmin()
      .from("placements")
      .select(
        `
        *,
        candidates ( first_name, last_name ),
        jobs ( title, company_id ),
        companies ( id, company_name, billing_email )
      `
      )
      .eq("id", placementId)
      .single();

    if (placementError || !placement) {
      return NextResponse.json(
        { error: "Placeringen hittades inte" },
        { status: 404 }
      );
    }

    if (placement.status !== "confirmed") {
      return NextResponse.json(
        { error: "Placeringen måste ha status 'confirmed' för att skapa faktura" },
        { status: 400 }
      );
    }

    const companyId = (placement.jobs as any)?.company_id || placement.company_id;

    // Get or create Stripe customer for the company
    const customerId = await getOrCreateStripeCustomer(companyId);

    const candidateName = `${(placement.candidates as any)?.first_name} ${(placement.candidates as any)?.last_name}`;
    const jobTitle = (placement.jobs as any)?.title || "Okänd tjänst";

    // Create Stripe Invoice
    const invoice = await getStripe().invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: 30,
      currency: (placement.salary_currency || "sek").toLowerCase(),
      metadata: {
        placement_id: placementId,
        company_id: companyId,
        recruiter_id: placement.recruiter_id,
      },
    });

    // Add invoice item for the recruitment fee
    await getStripe().invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: Math.round(placement.total_fee * 100), // Convert to öre
      currency: (placement.salary_currency || "sek").toLowerCase(),
      description: `Rekryteringsavgift: ${candidateName} - ${jobTitle} (${placement.fee_percentage}% av årslön)`,
    });

    // Finalize and send the invoice
    const sentInvoice = await getStripe().invoices.sendInvoice(invoice.id);

    // Update placement status
    await getSupabaseAdmin()
      .from("placements")
      .update({
        status: "invoice_sent",
        stripe_invoice_id: sentInvoice.id,
        invoice_sent_at: new Date().toISOString(),
      })
      .eq("id", placementId);

    return NextResponse.json({
      success: true,
      invoiceId: sentInvoice.id,
      invoiceUrl: sentInvoice.hosted_invoice_url,
    });
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { error: "Kunde inte skapa faktura" },
      { status: 500 }
    );
  }
}
