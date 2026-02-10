"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/login");

  return supabase;
}

export async function approveRecruiter(recruiterId: string) {
  const supabase = await verifyAdmin();

  const { error } = await supabase
    .from("recruiters")
    .update({
      approval_status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", recruiterId);

  if (error) {
    throw new Error(`Kunde inte godkänna rekryterare: ${error.message}`);
  }

  // Create notification for the recruiter
  await supabase.from("notifications").insert({
    user_id: recruiterId,
    type: "approval",
    title: "Ditt konto har godkänts",
    message:
      "Välkommen till Rekryto! Ditt konto har godkänts och du kan nu börja ta uppdrag.",
  });

  // Log activity
  await supabase.from("activity_log").insert({
    action_type: "recruiter_approved",
    description: `Rekryterare godkänd`,
    entity_type: "recruiter",
    entity_id: recruiterId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/recruiters");
}

export async function rejectRecruiter(recruiterId: string) {
  const supabase = await verifyAdmin();

  const { error } = await supabase
    .from("recruiters")
    .update({
      approval_status: "rejected",
    })
    .eq("id", recruiterId);

  if (error) {
    throw new Error(`Kunde inte neka rekryterare: ${error.message}`);
  }

  // Create notification for the recruiter
  await supabase.from("notifications").insert({
    user_id: recruiterId,
    type: "rejection",
    title: "Din ansökan har nekats",
    message:
      "Tyvärr har din ansökan om att bli rekryterare på Rekryto nekats. Kontakta support för mer information.",
  });

  // Log activity
  await supabase.from("activity_log").insert({
    action_type: "recruiter_rejected",
    description: `Rekryterare nekad`,
    entity_type: "recruiter",
    entity_id: recruiterId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/recruiters");
}

export async function suspendRecruiter(recruiterId: string) {
  const supabase = await verifyAdmin();

  const { error } = await supabase
    .from("recruiters")
    .update({
      approval_status: "suspended",
    })
    .eq("id", recruiterId);

  if (error) {
    throw new Error(`Kunde inte stänga av rekryterare: ${error.message}`);
  }

  // Create notification for the recruiter
  await supabase.from("notifications").insert({
    user_id: recruiterId,
    type: "suspension",
    title: "Ditt konto har stängts av",
    message:
      "Ditt konto på Rekryto har tillfälligt stängts av. Kontakta support för mer information.",
  });

  // Log activity
  await supabase.from("activity_log").insert({
    action_type: "recruiter_suspended",
    description: `Rekryterare avstängd`,
    entity_type: "recruiter",
    entity_id: recruiterId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/recruiters");
}

export async function reactivateRecruiter(recruiterId: string) {
  const supabase = await verifyAdmin();

  const { error } = await supabase
    .from("recruiters")
    .update({
      approval_status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", recruiterId);

  if (error) {
    throw new Error(`Kunde inte återaktivera rekryterare: ${error.message}`);
  }

  // Create notification for the recruiter
  await supabase.from("notifications").insert({
    user_id: recruiterId,
    type: "reactivation",
    title: "Ditt konto har återaktiverats",
    message:
      "Ditt konto på Rekryto har återaktiverats. Du kan nu börja ta uppdrag igen.",
  });

  // Log activity
  await supabase.from("activity_log").insert({
    action_type: "recruiter_reactivated",
    description: `Rekryterare återaktiverad`,
    entity_type: "recruiter",
    entity_id: recruiterId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/recruiters");
}
