"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import type { Locale } from "./config";

type Dictionary = Record<string, Record<string, string>>;

interface I18nContextValue {
    locale: Locale;
    dictionary: Dictionary;
    t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LocaleProvider({
    locale,
    dictionary,
    children,
}: {
    locale: Locale;
    dictionary: Dictionary;
    children: ReactNode;
}) {
    const t = useCallback(
        (key: string): string => {
            const parts = key.split(".");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let value: any = dictionary;
            for (const part of parts) {
                value = value?.[part];
            }
            return typeof value === "string" ? value : key;
        },
        [dictionary]
    );

    return (
        <I18nContext.Provider value={{ locale, dictionary, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslations() {
    const ctx = useContext(I18nContext);
    if (!ctx) {
        throw new Error("useTranslations must be used within a LocaleProvider");
    }
    return ctx;
}

export function useLocale(): Locale {
    const ctx = useContext(I18nContext);
    if (!ctx) {
        throw new Error("useLocale must be used within a LocaleProvider");
    }
    return ctx.locale;
}
