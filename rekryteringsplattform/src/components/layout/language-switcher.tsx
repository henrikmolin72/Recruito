"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { setLocale } from "@/i18n/actions";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
    const currentLocale = useLocale();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleChange = (newLocale: Locale) => {
        startTransition(async () => {
            await setLocale(newLocale);
            router.refresh();
        });
    };

    return (
        <div className="px-2 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Language
            </p>
            <div className="flex gap-1">
                {LOCALES.map((locale) => (
                    <button
                        key={locale}
                        onClick={() => handleChange(locale)}
                        disabled={isPending}
                        className={cn(
                            "px-2.5 py-1 rounded text-xs font-bold transition-all",
                            currentLocale === locale
                                ? "bg-brand-100 text-brand-700"
                                : "text-slate-500 hover:bg-slate-100",
                            isPending && "opacity-50"
                        )}
                    >
                        {LOCALE_LABELS[locale]}
                    </button>
                ))}
            </div>
        </div>
    );
}
