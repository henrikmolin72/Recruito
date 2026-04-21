"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // Check both app_metadata (secure, server-only) and user_metadata (legacy fallback)
    const isAdmin = user?.app_metadata?.role === "admin" || user?.user_metadata?.role === "admin";
    if (!user || !isAdmin) {
        redirect("/login");
    }
    return { supabase, user };
}
