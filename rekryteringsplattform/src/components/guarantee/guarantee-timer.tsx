"use client";

import { useState, useEffect } from "react";
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuaranteeTimerProps {
    guaranteeEndDate: string;
    /** Guarantee start (e.g. payment date) — used to size the progress bar. */
    guaranteeStartDate?: string | null;
    candidateName: string;
    jobTitle: string;
    className?: string;
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

export function GuaranteeTimer({ guaranteeEndDate, guaranteeStartDate, candidateName, jobTitle, className }: GuaranteeTimerProps) {
    const [days, setDays] = useState(() => daysUntil(guaranteeEndDate));

    useEffect(() => {
        // Recalculate daily
        const timer = setInterval(() => setDays(daysUntil(guaranteeEndDate)), 60_000);
        return () => clearInterval(timer);
    }, [guaranteeEndDate]);

    const expired = days <= 0;
    const critical = days > 0 && days <= 7;
    const warning = days > 7 && days <= 14;
    const safe = days > 14;

    // Derive the period length from the real start date when available
    // (guarantees run 1–3 months); fall back to 30 days otherwise.
    const derivedTotal = guaranteeStartDate ? daysBetween(guaranteeStartDate, guaranteeEndDate) : 0;
    const totalDays = derivedTotal > 0 ? derivedTotal : 30;
    const elapsed = totalDays - days;
    const progressPct = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));

    const statusConfig = expired
        ? { icon: ShieldCheck, color: "text-success-600", bg: "bg-success-50", border: "border-success-200", label: "Avslutad", bar: "bg-success-400" }
        : critical
        ? { icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: `${days}d kvar`, bar: "bg-red-400" }
        : warning
        ? { icon: Shield, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: `${days}d kvar`, bar: "bg-amber-400" }
        : { icon: Shield, color: "text-success-600", bg: "bg-success-50", border: "border-success-200", label: `${days}d kvar`, bar: "bg-success-400" };

    const Icon = statusConfig.icon;

    return (
        <div className={cn("rounded-xl border p-4 space-y-3", statusConfig.bg, statusConfig.border, className)}>
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4 shrink-0", statusConfig.color)} />
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Garanti</p>
                        <p className="text-sm font-semibold text-slate-800">{candidateName}</p>
                    </div>
                </div>
                <div className={cn("text-right")}>
                    <p className={cn("text-xl font-black", statusConfig.color)}>
                        {expired ? "✓" : days}
                    </p>
                    <p className="text-[10px] text-slate-500">
                        {expired ? "Godkänd" : "dagar kvar"}
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-slate-200/50">
                <div
                    className={cn("h-full rounded-full transition-all duration-700", statusConfig.bar)}
                    style={{ width: `${progressPct}%` }}
                />
            </div>

            <div className="flex justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> Dag {Math.max(0, elapsed)} av {totalDays}
                </span>
                <span>Löper ut: {new Date(guaranteeEndDate).toLocaleDateString("sv-SE")}</span>
            </div>
        </div>
    );
}
