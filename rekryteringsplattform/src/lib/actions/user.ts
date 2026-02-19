"use server"

import { createClient } from "@/lib/supabase/server";

export async function getSidebarData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const initials = user.user_metadata.full_name
        ?.split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase() || "U";

    return {
        fullName: user.user_metadata.full_name || "Användare",
        initials,
        role: user.user_metadata.role || "company"
    };
}
