import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Get the user to determine their role for redirect
            const { data: { user } } = await supabase.auth.getUser();
            const role = user?.user_metadata?.role || "company";
            let nextPath = `/${role}`;

            if (role === "recruiter" && user) {
                const { data: recruiter } = await supabase
                    .from("recruiters")
                    .select("*")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (!recruiter?.onboarding_completed_at) {
                    nextPath = "/recruiter/profile?onboarding=1";
                }
            }

            const forwardedHost = request.headers.get("x-forwarded-host");
            const isLocalEnv = process.env.NODE_ENV === "development";

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${nextPath}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${nextPath}`);
            } else {
                return NextResponse.redirect(`${origin}${nextPath}`);
            }
        }
    }

    // Return to login with error
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
