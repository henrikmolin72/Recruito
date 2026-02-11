"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Generate invoice number: RKT-YYYY-XXXX
function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RKT-${year}-${random}`;
}

// Generate bank reference (OCR number for Swedish payments)
function generateBankReference(placementId: string): string {
  const digits = placementId.replace(/\D/g, "").slice(0, 10).padStart(10, "0");
  return digits;
}

export async function createInvoice(placementId: string) {
  const supabase = await createClient();

  const invoiceNumber = generateInvoiceNumber();
  const bankReference = generateBankReference(placementId);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const { error } = await supabase
    .from("placements")
    .update({
      status: "invoice_sent",
      invoice_number: invoiceNumber,
      bank_reference: bankReference,
      invoice_due_date: dueDate.toISOString().split("T")[0],
      invoice_sent_at: new Date().toISOString(),
    })
    .eq("id", placementId);

  if (error) return { error: "Kunde inte skapa faktura" };

  revalidatePath("/admin/placements");
  return { success: true, invoiceNumber, bankReference };
}

export async function confirmPaymentReceived(placementId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("placements")
    .update({
      status: "guarantee_active",
      payment_received_at: new Date().toISOString(),
    })
    .eq("id", placementId);

  if (error) return { error: "Kunde inte bekräfta betalning" };

  revalidatePath("/admin/placements");
  return { success: true };
}

export async function initiateRecruiterPayout(placementId: string) {
  const supabase = await createClient();

  const { data: placement } = await supabase
    .from("placements")
    .select(
      "*, recruiters(bank_name, bank_account_number, bank_clearing_number, user_id)"
    )
    .eq("id", placementId)
    .single();

  if (!placement) return { error: "Placering hittades inte" };
  if (placement.status !== "guarantee_active")
    return { error: "Placering inte i garantiperiod" };
  if (new Date(placement.guarantee_end_date) > new Date())
    return { error: "Garantiperioden har inte löpt ut" };

  const payoutRef = `PAY-${Date.now()}`;

  const { error } = await supabase
    .from("placements")
    .update({
      status: "payout_released",
      payout_bank_reference: payoutRef,
      payout_method: "bank_transfer",
      payout_released_at: new Date().toISOString(),
    })
    .eq("id", placementId);

  if (error) return { error: "Kunde inte initiera utbetalning" };

  revalidatePath("/admin/placements");
  return { success: true, payoutRef };
}
