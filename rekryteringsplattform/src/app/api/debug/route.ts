import { NextResponse } from "next/server";

export async function GET() {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Not available" }, { status: 404 });
    }

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin";
    if (!isAdmin) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: candidates } = await supabase
        .from("candidates")
        .select(`id, first_name, last_name, status`);

    return NextResponse.json({ currentUser: user.id, candidates });
}
