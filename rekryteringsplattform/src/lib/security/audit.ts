"use server";

import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | "login"
  | "logout"
  | "register"
  | "profile_update"
  | "job_created"
  | "job_status_changed"
  | "candidate_submitted"
  | "candidate_status_changed"
  | "placement_created"
  | "payment_initiated"
  | "payout_released"
  | "recruiter_approved"
  | "recruiter_rejected"
  | "data_export"
  | "data_deletion"
  | "mandate_claimed"
  | "mandate_released";

export async function auditLog(
  action: AuditAction,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("activity_log").insert({
    user_id: user?.id ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata ? metadata : null,
  });
}
