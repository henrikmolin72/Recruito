import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE } from "@/i18n/config";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Skip Supabase auth if credentials are not configured
    if (!supabaseUrl || !supabaseAnonKey) {
        // Still handle locale detection
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

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
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

    // Admin routes require admin role
    if (user && request.nextUrl.pathname.startsWith("/admin")) {
        const role = user.user_metadata?.role;
        if (role !== "admin") {
            const url = request.nextUrl.clone();
            url.pathname = `/${role || "company"}`;
            return NextResponse.redirect(url);
        }
    }

    // If logged in user tries to access login/register, redirect to dashboard
    const authPaths = ["/login", "/register"];
    const isAuthRoute = authPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    if (isAuthRoute && user) {
        // Get user role from metadata to redirect to correct dashboard
        const role = user.user_metadata?.role || "company";
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
