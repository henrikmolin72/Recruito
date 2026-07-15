import { createAdminClient } from "@/lib/supabase/admin";

export type SuppressionReason = "hard_bounce" | "complaint";

// Normalize so a webhook writing "User@X.com" and a send checking "user@x.com"
// resolve to the same row. Lowercasing is the safe normalization for the
// addresses we handle; we deliberately don't touch the local part beyond case.
function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * True if the recipient is on the suppression list (hard bounce or complaint).
 *
 * Fails OPEN: on any lookup error we return false and let the send proceed. A
 * missed suppression costs at most one extra bounce, whereas a false positive
 * would block critical transactional mail (e.g. password resets) — the worse
 * failure. The webhook is the source of truth; this is a best-effort guard.
 */
export async function isSuppressed(email: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("email_suppressions")
      .select("email")
      .eq("email", normalize(email))
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("isSuppressed lookup failed, sending anyway:", error);
      return false;
    }
    return !!data;
  } catch (err) {
    console.error("isSuppressed threw, sending anyway:", err);
    return false;
  }
}

/**
 * Record (or refresh) a suppression. Idempotent via the UNIQUE(email, reason)
 * constraint — a duplicate webhook delivery just bumps last_event_at. Throws on
 * write failure so the webhook handler can return 500 and let Svix retry rather
 * than silently dropping the suppression.
 */
export async function addSuppression(email: string, reason: SuppressionReason): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("email_suppressions")
    .upsert(
      { email: normalize(email), reason, last_event_at: new Date().toISOString() },
      { onConflict: "email,reason" },
    );
  if (error) throw error;
}
