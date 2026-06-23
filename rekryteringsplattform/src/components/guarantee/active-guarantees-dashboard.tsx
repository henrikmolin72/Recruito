"use client";

import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

interface ActiveGuarantee {
    id: string;
    candidateName: string;
    companyName: string;
    jobTitle: string;
    guaranteeEndDate: string;
    totalFee: number;
    currency: string;
    status: string;
}

interface ActiveGuaranteesDashboardProps {
    guarantees: ActiveGuarantee[];
}

function daysUntil(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function GuaranteeStatusDot({ days }: { days: number }) {
    const { t } = useTranslations();
    if (days <= 0) return <span className="h-2.5 w-2.5 rounded-full bg-slate-300 inline-block" title={t("components.guaranteeExpired")} />;
    if (days <= 7) return <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block animate-pulse" title={t("components.guaranteeCritical")} />;
    if (days <= 14) return <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" title={t("components.guaranteeWarning")} />;
    return <span className="h-2.5 w-2.5 rounded-full bg-success-500 inline-block" title={t("components.guaranteeOk")} />;
}

function ProgressMini({ days, total = 30 }: { days: number; total?: number }) {
    const { t } = useTranslations();
    const elapsed = Math.max(0, total - days);
    const pct = Math.min(100, Math.round((elapsed / total) * 100));
    const color = days <= 0 ? "bg-slate-300" : days <= 7 ? "bg-red-400" : days <= 14 ? "bg-amber-400" : "bg-success-400";

    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-slate-500">
                {t("components.guaranteeDayShort").replace("{elapsed}", String(elapsed)).replace("{total}", String(total))}
            </span>
        </div>
    );
}

export function ActiveGuaranteesDashboard({ guarantees }: ActiveGuaranteesDashboardProps) {
    const { t } = useTranslations();
    const sorted = [...guarantees].sort((a, b) => {
        return daysUntil(a.guaranteeEndDate) - daysUntil(b.guaranteeEndDate);
    });

    const critical = sorted.filter((g) => daysUntil(g.guaranteeEndDate) <= 7 && daysUntil(g.guaranteeEndDate) > 0);
    const warning = sorted.filter((g) => daysUntil(g.guaranteeEndDate) > 7 && daysUntil(g.guaranteeEndDate) <= 14);
    const safe = sorted.filter((g) => daysUntil(g.guaranteeEndDate) > 14);

    if (guarantees.length === 0) {
        return (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
                <ShieldCheck className="h-10 w-10 opacity-20" />
                <p className="text-sm">{t("components.guaranteeNoneActive")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary chips */}
            <div className="flex gap-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-red-700">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> {critical.length} {t("components.guaranteeCritical")}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                    <span className="h-2 w-2 rounded-full bg-amber-400" /> {warning.length} {t("components.guaranteeWarning")}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-success-200 bg-success-50 text-success-700">
                    <span className="h-2 w-2 rounded-full bg-success-500" /> {safe.length} {t("components.guaranteeOk")}
                </span>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("components.guaranteeColCandidate")}</th>
                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("components.guaranteeColCompany")}</th>
                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("components.guaranteeColProgress")}</th>
                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("components.guaranteeColDaysLeft")}</th>
                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("components.guaranteeColFee")}</th>
                            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("components.guaranteeColExpires")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((g) => {
                            const days = daysUntil(g.guaranteeEndDate);
                            return (
                                <tr key={g.id} className={cn(
                                    "border-b border-slate-100 last:border-0",
                                    days <= 7 && days > 0 ? "bg-red-50/40" : days <= 14 && days > 0 ? "bg-amber-50/30" : ""
                                )}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <GuaranteeStatusDot days={days} />
                                            <div>
                                                <p className="font-semibold text-slate-800">{g.candidateName}</p>
                                                <p className="text-[11px] text-slate-500">{g.jobTitle}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{g.companyName}</td>
                                    <td className="px-4 py-3">
                                        <ProgressMini days={days} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn(
                                            "font-bold",
                                            days <= 0 ? "text-slate-400" : days <= 7 ? "text-red-600" : days <= 14 ? "text-amber-600" : "text-success-700"
                                        )}>
                                            {days <= 0 ? t("components.guaranteeExpired") : `${days}d`}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-slate-700">
                                        {formatCurrency(g.totalFee, g.currency)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">
                                        {formatDate(g.guaranteeEndDate)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
