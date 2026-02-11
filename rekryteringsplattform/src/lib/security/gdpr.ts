"use server";

import { createClient } from "@/lib/supabase/server";
import { auditLog } from "./audit";

// Export all user data (GDPR Article 15 - Right of Access)
export async function exportUserData(userId: string) {
  const supabase = await createClient();

  const [
    profile,
    company,
    recruiter,
    candidates,
    placements,
    messages,
    notifications,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("companies").select("*").eq("user_id", userId),
    supabase.from("recruiters").select("*").eq("user_id", userId),
    supabase.from("candidates").select("*").or(`recruiter_id.eq.${userId}`),
    supabase
      .from("placements")
      .select("*")
      .or(`recruiter_id.eq.${userId},company_id.eq.${userId}`),
    supabase.from("messages").select("*").eq("sender_id", userId),
    supabase.from("notifications").select("*").eq("user_id", userId),
  ]);

  await auditLog("data_export", "profile", userId);

  return {
    profile: profile.data,
    companies: company.data,
    recruiters: recruiter.data,
    candidates: candidates.data,
    placements: placements.data,
    messages: messages.data,
    notifications: notifications.data,
    exported_at: new Date().toISOString(),
  };
}

// Request data deletion (GDPR Article 17 - Right to Erasure)
export async function requestDataDeletion(userId: string) {
  const supabase = await createClient();

  // Anonymize rather than delete to preserve platform integrity
  // Active placements in guarantee period cannot be deleted
  const { data: activePlacements } = await supabase
    .from("placements")
    .select("id")
    .eq("recruiter_id", userId)
    .in("status", [
      "confirmed",
      "invoice_sent",
      "payment_received",
      "guarantee_active",
    ]);

  if (activePlacements && activePlacements.length > 0) {
    return {
      error:
        "Kan inte radera konto med aktiva placeringar under garantiperiod",
      activePlacements: activePlacements.length,
    };
  }

  // Anonymize profile data
  await supabase
    .from("profiles")
    .update({
      full_name: "[Raderad användare]",
      email: `deleted_${userId.slice(0, 8)}@removed.local`,
      phone: null,
      avatar_url: null,
    })
    .eq("id", userId);

  await auditLog("data_deletion", "profile", userId);

  return { success: true };
}
