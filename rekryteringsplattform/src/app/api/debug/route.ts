import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: candidates } = await supabase
        .from("candidates")
        .select(`
      id, first_name, last_name, 
      recruiter:recruiters(id, user_id, profile:profiles(full_name))
    `);

    return NextResponse.json({
        currentUser: user?.id,
        candidates
    });
}
