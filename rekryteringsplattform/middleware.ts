import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const COMING_SOON_ENABLED = true;
const PREVIEW_TOKEN = process.env.PREVIEW_TOKEN;
const COOKIE_NAME = "recruito_preview";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dagar

// Paths that are always accessible (even in coming soon mode)
const PUBLIC_PATHS = [
    "/coming-soon",
    "/_next",
    "/favicon.ico",
    "/images",
    "/api/preview",
    // Machine-facing endpoints: callers are Svix and Vercel Cron, which have no
    // preview cookie to present and follow no redirect, so the gate silently
    // turned every delivery into a 307 to /coming-soon. Each carries its own
    // auth (Svix signature / CRON_SECRET), so the gate added no protection here.
    "/api/webhooks",
    "/api/cron",
    "/api/guarantee/reminders",
];

export async function middleware(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl;

    // --- Coming Soon gate ---
    if (COMING_SOON_ENABLED) {
        // Check for ?preview=TOKEN bypass — set cookie and redirect clean URL
        const previewParam = searchParams.get("preview");
        if (PREVIEW_TOKEN && previewParam === PREVIEW_TOKEN) {
            const cleanUrl = new URL(pathname, request.url);
            const response = NextResponse.redirect(cleanUrl);
            response.cookies.set(COOKIE_NAME, "true", {
                httpOnly: true,
                secure: true,
                sameSite: "lax",
                maxAge: COOKIE_MAX_AGE,
                path: "/",
            });
            return response;
        }

        const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

        if (!isPublicPath) {
            const previewCookie = request.cookies.get(COOKIE_NAME);

            if (!previewCookie) {
                return NextResponse.redirect(
                    new URL("/coming-soon", request.url)
                );
            }
        }
    }

    // --- Supabase session + auth routing ---
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
