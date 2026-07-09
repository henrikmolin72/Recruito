"use client";

import { ShieldCheck } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/i18n/client";
import type { GuaranteeDisplayStatus } from "@/lib/guarantee";

export interface GuaranteeRow {
    id: string;
    jobTitle: string;
    /** Company name on the recruiter side, recruiter name on the company side. */
    counterparty: string;
    candidateName: string;
    fee: number;
    currency: string;
    joiningDate: string | null;
    guaranteeEndDate: string | null;
    displayStatus: GuaranteeDisplayStatus;
}

interface GuaranteeTableProps {
    rows: GuaranteeRow[];
    /** Which party the counterparty column shows. */
    counterparty: "company" | "recruiter";
}

function daysUntil(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function daysBetween(startStr: string, endStr: string): number {
    const start = new Date(startStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endStr);
    end.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function ProgressMini({ joiningDate, endDate }: { joiningDate: string; endDate: string }) {
    const { t } = useTranslations();
    const days = daysUntil(endDate);
    const total = Math.max(1, daysBetween(joiningDate, endDate));
    const elapsed = Math.min(total, Math.max(0, total - days));
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

const STATUS_BADGE: Record<GuaranteeDisplayStatus, { variant: "blue" | "success" | "danger" | "warning"; labelKey: string }> = {
    active: { variant: "blue", labelKey: "components.guaranteeStatusActive" },
    completed: { variant: "success", labelKey: "components.guaranteeStatusCompleted" },
    failed: { variant: "danger", labelKey: "components.guaranteeStatusFailed" },
    pending: { variant: "warning", labelKey: "components.guaranteeStatusPending" },
};

/**
 * Guarantee overview table shared by /recruiter/guarantees and
 * /company/guarantees: Joining Date → Guarantee Ends with a live
 * remaining-period progress bar per active row.
 */
export function GuaranteeTable({ rows, counterparty }: GuaranteeTableProps) {
    const { t } = useTranslations();

    if (rows.length === 0) {
        return (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
                <ShieldCheck className="h-10 w-10 opacity-20" />
                <p className="text-sm">{t("components.guaranteeNoneYet")}</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
                <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("components.guaranteeColJob")}</th>
                        <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {t(counterparty === "company" ? "components.guaranteeColCompany" : "components.guaranteeColRecruiter")}
                        </th>
                        <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("components.guaranteeColCandidate")}</th>
                        <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("components.guaranteeColFee")}</th>
                        <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("components.guaranteeColJoining")}</th>
                        <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("components.guaranteeColEnds")}</th>
                        <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("components.guaranteeColProgress")}</th>
                        <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("components.guaranteeColStatus")}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const badge = STATUS_BADGE[row.displayStatus];
                        return (
                            <tr key={row.id} className="border-b border-slate-100 last:border-0">
                                <td className="px-4 py-3 font-semibold text-slate-800">{row.jobTitle}</td>
                                <td className="px-4 py-3 text-slate-600">{row.counterparty}</td>
                                <td className="px-4 py-3 text-slate-600">{row.candidateName}</td>
                                <td className="px-4 py-3 font-semibold text-slate-700">{formatCurrency(row.fee, row.currency)}</td>
                                <td className="px-4 py-3 text-slate-600">{row.joiningDate ? formatDate(row.joiningDate) : "—"}</td>
                                <td className="px-4 py-3 text-slate-600">{row.guaranteeEndDate ? formatDate(row.guaranteeEndDate) : "—"}</td>
                                <td className="px-4 py-3">
                                    {row.displayStatus === "active" && row.joiningDate && row.guaranteeEndDate ? (
                                        <ProgressMini joiningDate={row.joiningDate} endDate={row.guaranteeEndDate} />
                                    ) : (
                                        <span className="text-slate-300 text-xs">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant={badge.variant}>{t(badge.labelKey)}</Badge>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
