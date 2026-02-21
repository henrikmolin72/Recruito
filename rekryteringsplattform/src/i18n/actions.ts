"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE_NAME, LOCALES, type Locale } from "./config";

export async function setLocale(locale: string) {
    if (!LOCALES.includes(locale as Locale)) {
        return;
    }
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE_NAME, locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
    });
}
