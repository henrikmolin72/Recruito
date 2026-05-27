"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/client";
import { setLocale } from "@/i18n/actions";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

type LanguageSwitcherProps = {
    compact?: boolean;
    variant?: "buttons" | "dropdown";
    tone?: "light" | "dark";
};

export function LanguageSwitcher({
    compact = false,
    variant = "buttons",
    tone = "light",
}: LanguageSwitcherProps) {
    const currentLocale = useLocale();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Mount-gate for the Select component to avoid hydration mismatch. The
        // set-state-in-effect pattern is intentional and SSR-safe.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const handleChange = (newLocale: Locale) => {
        startTransition(async () => {
            await setLocale(newLocale);
            router.refresh();
        });
    };

    if (variant === "dropdown") {
        const isDarkTone = tone === "dark";

        if (!mounted) {
            return (
                <div
                    className={cn(
                        "rounded-full font-semibold shadow-sm flex items-center gap-2 px-3",
                        isDarkTone
                            ? "border border-slate-700 bg-slate-800/80 text-slate-100"
                            : "border border-slate-200 bg-white text-slate-700",
                        compact ? "h-8 w-[132px] text-xs" : "h-9 w-[150px] text-sm"
                    )}
                >
                    <Globe className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", isDarkTone ? "text-slate-300" : "text-slate-500")} />
                    <span>{LOCALE_LABELS[currentLocale]}</span>
                </div>
            );
        }

        return (
            <Select
                value={currentLocale}
                onValueChange={(newLocale) => handleChange(newLocale as Locale)}
            >
                <SelectTrigger
                    aria-label="Select language"
                    disabled={isPending}
                    className={cn(
                        "rounded-full font-semibold shadow-sm",
                        isDarkTone
                            ? "border-slate-700 bg-slate-800/80 text-slate-100 focus:ring-brand-500/50"
                            : "border-slate-200 bg-white text-slate-700 focus:ring-brand-300",
                        compact ? "h-8 w-[132px] text-xs" : "h-9 w-[150px] text-sm",
                        isPending && "opacity-60"
                    )}
                >
                    <span className="flex items-center gap-2">
                        <Globe
                            className={cn(
                                compact ? "h-3.5 w-3.5" : "h-4 w-4",
                                isDarkTone ? "text-slate-300" : "text-slate-500"
                            )}
                        />
                        <SelectValue placeholder={LOCALE_LABELS[currentLocale]} />
                    </span>
                </SelectTrigger>
                <SelectContent
                    className={cn(
                        isDarkTone ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white"
                    )}
                >
                    {LOCALES.map((locale) => (
                        <SelectItem
                            key={locale}
                            value={locale}
                            className={cn(
                                "font-medium",
                                isDarkTone
                                    ? "text-slate-200 focus:bg-slate-800 focus:text-white"
                                    : "text-slate-700 focus:text-slate-900"
                            )}
                        >
                            {LOCALE_LABELS[locale]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    if (compact) {
        return (
            <div className="flex gap-1">
                {LOCALES.map((locale) => (
                    <button
                        key={locale}
                        onClick={() => handleChange(locale)}
                        disabled={isPending}
                        aria-label={`Switch language to ${LOCALE_LABELS[locale]}`}
                        className={cn(
                            "px-2 py-1 rounded text-xs font-semibold transition-all",
                            currentLocale === locale
                                ? "bg-brand-100 text-brand-700"
                                : "text-slate-500 hover:bg-slate-100",
                            isPending && "opacity-50"
                        )}
                    >
                        {locale.toUpperCase()}
                    </button>
                ))}
            </div>
        );
    }

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
