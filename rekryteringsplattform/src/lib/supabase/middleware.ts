import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE } from "@/i18n/config";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session if expired
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Protected routes - redirect to login if not authenticated
    const protectedPaths = ["/company", "/recruiter", "/admin"];
    const isProtectedRoute = protectedPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    if (isProtectedRoute && !user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Role-based route enforcement
    if (user) {
        const role = user.app_metadata?.role || user.user_metadata?.role;
        if (request.nextUrl.pathname.startsWith("/admin") && role !== "admin") {
            const url = request.nextUrl.clone();
            url.pathname = `/${role || "company"}`;
            return NextResponse.redirect(url);
        }
        // Admin can access /company as well
        if (request.nextUrl.pathname.startsWith("/company") && role === "recruiter") {
            const url = request.nextUrl.clone();
            url.pathname = "/recruiter";
            return NextResponse.redirect(url);
        }
        if (request.nextUrl.pathname.startsWith("/recruiter") && (role === "company" || role === "admin")) {
            const url = request.nextUrl.clone();
            url.pathname = `/${role}`;
            return NextResponse.redirect(url);
        }
    }

    // If logged in user tries to access login/register, redirect to dashboard
    const authPaths = ["/login", "/register"];
    const isAuthRoute = authPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    if (isAuthRoute && user) {
        const role = user.app_metadata?.role || user.user_metadata?.role || "company";
        const url = request.nextUrl.clone();
        url.pathname = `/${role}`;
        return NextResponse.redirect(url);
    }

    // Auto-detect locale for first-time visitors
    const localeCookie = request.cookies.get("NEXT_LOCALE");
    if (!localeCookie) {
        const acceptLang = request.headers.get("accept-language") || "";
        const detected = detectLocaleFromHeader(acceptLang);
        supabaseResponse.cookies.set("NEXT_LOCALE", detected, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
            sameSite: "lax",
        });
    }

    return supabaseResponse;
}

function detectLocaleFromHeader(acceptLanguage: string): string {
    const supported: Record<string, string> = {
        sv: "sv",
        da: "da",
        no: "no",
        nb: "no",
        nn: "no",
    };
    const parts = acceptLanguage.split(",");
    for (const part of parts) {
        const lang = part.split(";")[0].trim().toLowerCase();
        const short = lang.split("-")[0];
        const matched = supported[short];
        if (matched) return matched;
    }
    return DEFAULT_LOCALE;
}
