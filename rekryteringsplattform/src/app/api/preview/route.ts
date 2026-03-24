import { NextRequest, NextResponse } from "next/server";

const PREVIEW_TOKEN = process.env.PREVIEW_TOKEN || "recruito2026launch";
const COOKIE_NAME = "recruito_preview";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dagar

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (token !== PREVIEW_TOKEN) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const redirectUrl = new URL("/", request.url);
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set(COOKIE_NAME, "true", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
