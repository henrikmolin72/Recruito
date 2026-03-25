import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, type Locale, LOCALES } from "./config";

import sv from "./dictionaries/sv.json";
import en from "./dictionaries/en.json";
import da from "./dictionaries/da.json";
import no from "./dictionaries/no.json";

type Dictionary = typeof sv;
type Namespace = keyof Dictionary;

const dictionaries: Record<Locale, Dictionary> = { sv, en, da, no };

export async function getLocale(): Promise<Locale> {
    const cookieStore = await cookies();
    const raw = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    if (raw && LOCALES.includes(raw as Locale)) {
        return raw as Locale;
    }
    return DEFAULT_LOCALE;
}

export async function getTranslations<N extends Namespace>(namespace: N): Promise<Dictionary[N]> {
    const locale = await getLocale();
    const dict = dictionaries[locale];
    return dict[namespace];
}

export async function getDictionary(): Promise<Dictionary> {
    const locale = await getLocale();
    return dictionaries[locale];
}

export async function createTranslator() {
    const locale = await getLocale();
    const dict = dictionaries[locale];

    return function t(key: string, params?: Record<string, string | number>): string {
        const parts = key.split(".");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let value: any = dict;
        for (const part of parts) {
            value = value?.[part];
        }
        let result = typeof value === "string" ? value : key;
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                result = result.replace(`{${k}}`, String(v));
            }
        }
        return result;
    };
}
