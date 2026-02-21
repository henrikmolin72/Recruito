export const LOCALES = ["sv", "en", "da", "no"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "sv";
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export const LOCALE_LABELS: Record<Locale, string> = {
    sv: "Svenska",
    en: "English",
    da: "Dansk",
    no: "Norsk",
};
