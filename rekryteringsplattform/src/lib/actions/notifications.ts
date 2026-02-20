"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getNotifications() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

    return notifications || [];
}

export async function markAsRead(notificationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id);

    revalidatePath("/");
}

export async function markAllAsRead() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

    revalidatePath("/");
}

// Internal helper to create notification (not exposed as action)
export async function createNotification(userId: string, title: string, body: string, link?: string) {
    const supabaseAdmin = createAdminClient();

    const normalizedTitle = title.trim();
    const normalizedBody = body.trim();
    const normalizedLink = link?.trim() || null;

    if (!normalizedTitle || !normalizedBody || !userId) {
        return;
    }

    const { error } = await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        title: normalizedTitle,
        body: normalizedBody,
        link: normalizedLink
    });

    if (error) {
        console.error("Failed to create notification:", error);
    }
}
