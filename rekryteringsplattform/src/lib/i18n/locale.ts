import { cookies } from "next/headers";
import type { Locale } from "./translations";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value;
  if (locale === "sv" || locale === "no" || locale === "da" || locale === "en") {
    return locale;
  }
  return "sv";
}
