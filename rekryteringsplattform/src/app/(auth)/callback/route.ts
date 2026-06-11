import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
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
            const role = user?.app_metadata?.role || user?.user_metadata?.role || "company";
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

            const isLocalEnv = process.env.NODE_ENV === "development";

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${nextPath}`);
            }
            // Prefer the configured app URL — x-forwarded-host is client-
            // influenced behind misconfigured proxies (open-redirect vector).
            if (process.env.NEXT_PUBLIC_APP_URL) {
                return NextResponse.redirect(`${getSiteUrl()}${nextPath}`);
            }
            const forwardedHost = request.headers.get("x-forwarded-host");
            if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${nextPath}`);
            }
            return NextResponse.redirect(`${origin}${nextPath}`);
        }
    }

    // Return to login with error
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
