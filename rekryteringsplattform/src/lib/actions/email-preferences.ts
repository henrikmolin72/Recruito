"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Toggle the current user's notification-email opt-out (profiles.email_opt_out,
 * migration 037). Enforced at the email dispatch chokepoint in
 * src/lib/email/internal-notifications.ts. Own-row only — keyed on auth uid.
 */
export async function updateEmailPreferences(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Ej inloggad" };

    const optOut = formData.get("email_notifications") !== "on";

    const { error } = await supabase
        .from("profiles")
        .update({ email_opt_out: optOut })
        .eq("id", user.id);

    if (error) {
        console.error("[updateEmailPreferences]", error);
        return { error: "Något gick fel. Försök igen." };
    }

    revalidatePath("/recruiter/profile");
    revalidatePath("/company/profile");
    return { success: true };
}
