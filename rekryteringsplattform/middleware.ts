import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const COMING_SOON_ENABLED = true;
const COOKIE_NAME = "recruito_preview";

// Paths that are always accessible (even in coming soon mode)
const PUBLIC_PATHS = [
    "/coming-soon",
    "/_next",
    "/favicon.ico",
    "/images",
    "/api",
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // --- Coming Soon gate ---
    if (COMING_SOON_ENABLED) {
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
