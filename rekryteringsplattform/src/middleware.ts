import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PREVIEW_TOKEN = process.env.PREVIEW_TOKEN || "recruito2026launch";
const COOKIE_NAME = "recruito_preview";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dagar

// Sidor som alltid är tillgängliga
const PUBLIC_PATHS = [
  "/coming-soon",
  "/_next",
  "/favicon.ico",
  "/images",
  "/api",
];

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Tillåt alltid publika paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Hantera bypass via ?preview=TOKEN
  const previewParam = searchParams.get("preview");
  if (previewParam === PREVIEW_TOKEN) {
    const response = NextResponse.redirect(
      new URL(pathname === "/" ? "/dashboard" : pathname, request.url)
    );
    response.cookies.set(COOKIE_NAME, PREVIEW_TOKEN, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  }

  // Kolla om bypass-cookie finns
  const previewCookie = request.cookies.get(COOKIE_NAME);
  if (previewCookie?.value === PREVIEW_TOKEN) {
    return NextResponse.next();
  }

  // Alla andra → coming soon
  if (pathname !== "/coming-soon") {
    return NextResponse.redirect(new URL("/coming-soon", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
