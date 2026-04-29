"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // Only trust app_metadata.role — user_metadata is writable by the user via auth.updateUser()
    const isAdmin = user?.app_metadata?.role === "admin";
    if (!user || !isAdmin) {
        redirect("/login");
    }
    return { supabase, user };
}
