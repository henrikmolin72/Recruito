import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/";

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Get the user to determine their role for redirect
            const { data: { user } } = await supabase.auth.getUser();
            const role = user?.user_metadata?.role || "company";
            const forwardedHost = request.headers.get("x-forwarded-host");
            const isLocalEnv = process.env.NODE_ENV === "development";

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}/${role}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}/${role}`);
            } else {
                return NextResponse.redirect(`${origin}/${role}`);
            }
        }
    }

    // Return to login with error
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
