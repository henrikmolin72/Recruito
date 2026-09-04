"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOnlineCounts } from "@/lib/actions/presence";
import { useTranslations } from "@/i18n/client";
import type { OnlineCounts } from "@/lib/presence";

const REFRESH_MS = 60_000;

/** Admin header: live recruiter/company online counts; click opens /admin/presence. */
export function OnlineCounter() {
    const { t } = useTranslations();
    const [counts, setCounts] = useState<OnlineCounts | null>(null);

    useEffect(() => {
        const load = () => getOnlineCounts().then(setCounts).catch(() => {});
        load();
        const interval = setInterval(load, REFRESH_MS);
        return () => clearInterval(interval);
    }, []);

    return (
        <Link
            href="/admin/presence"
            title={t("admin.presenceTitle")}
            className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-300 bg-emerald-100 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-200 transition-colors"
        >
            <span>{t("admin.recruitersOnline")}: {counts ? counts.recruiters : "—"}</span>
            <span className="text-emerald-400">|</span>
            <span>{t("admin.companiesOnline")}: {counts ? counts.companies : "—"}</span>
        </Link>
    );
}
