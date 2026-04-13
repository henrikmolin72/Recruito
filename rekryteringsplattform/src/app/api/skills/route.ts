import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams.get("q") || "";
    const category = request.nextUrl.searchParams.get("category") || "";

    const admin = createAdminClient();

    let query = admin
        .from("skills")
        .select("id, name, slug, category")
        .order("name")
        .limit(40);

    if (q) {
        query = query.ilike("name", `%${q}%`);
    }
    if (category) {
        query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: "Failed to fetch skills" }, { status: 500 });
    }

    return NextResponse.json({ skills: data ?? [] });
}
