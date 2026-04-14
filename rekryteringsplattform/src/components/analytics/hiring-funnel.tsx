"use client";

import { cn } from "@/lib/utils";

interface FunnelRow {
    jobId: string;
    jobTitle: string;
    status: string;
    submitted: number;
    aiScreened: number;
    aiScreenedPct: number;
    interviewed: number;
    interviewedPct: number;
    offered: number;
    offeredPct: number;
    hired: number;
    hiredPct: number;
}

interface HiringFunnelProps {
    data: FunnelRow[];
    selectedJobId?: string;
}

interface FunnelStep {
    label: string;
    key: keyof FunnelRow;
    pctKey: keyof FunnelRow;
    color: string;
}

const STEPS: FunnelStep[] = [
    { label: "Submitted", key: "submitted", pctKey: "submitted", color: "bg-slate-400" },
    { label: "AI Screened", key: "aiScreened", pctKey: "aiScreenedPct", color: "bg-blue-400" },
    { label: "Interviewed", key: "interviewed", pctKey: "interviewedPct", color: "bg-brand-400" },
    { label: "Offered", key: "offered", pctKey: "offeredPct", color: "bg-amber-400" },
    { label: "Hired", key: "hired", pctKey: "hiredPct", color: "bg-success-500" },
];

function FunnelBar({ step, value, pct, maxValue }: { step: FunnelStep; value: number; pct: number; maxValue: number }) {
    const width = maxValue > 0 ? Math.max(4, Math.round((value / maxValue) * 100)) : 4;
    return (
        <div className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-right">
                <span className="text-xs font-semibold text-slate-600">{step.label}</span>
            </div>
            <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                <div
                    className={cn("h-full rounded-lg transition-all duration-500", step.color)}
                    style={{ width: `${width}%` }}
                />
                <div className="absolute inset-0 flex items-center px-3 gap-2">
                    <span className="text-xs font-bold text-white drop-shadow">{value}</span>
                </div>
            </div>
            <div className="w-14 shrink-0">
                <span className="text-xs font-semibold text-slate-500">
                    {step.key === "submitted" ? "100%" : `${pct}%`}
                </span>
            </div>
        </div>
    );
}

function JobFunnel({ row }: { row: FunnelRow }) {
    const maxValue = row.submitted;
    return (
        <div className="space-y-2">
            <p className="text-sm font-bold text-slate-800 truncate">{row.jobTitle}</p>
            <div className="space-y-1.5">
                {STEPS.map((step) => (
                    <FunnelBar
                        key={step.key}
                        step={step}
                        value={row[step.key] as number}
                        pct={row[step.pctKey] as number}
                        maxValue={maxValue}
                    />
                ))}
            </div>
        </div>
    );
}

export function HiringFunnel({ data, selectedJobId }: HiringFunnelProps) {
    const rows = selectedJobId ? data.filter((r) => r.jobId === selectedJobId) : data;

    if (rows.length === 0) {
        return <p className="text-sm text-slate-400 py-4">No candidate data yet.</p>;
    }

    // Aggregate if multiple jobs selected
    if (!selectedJobId && rows.length > 1) {
        const agg: FunnelRow = {
            jobId: "all",
            jobTitle: `All ${rows.length} jobs`,
            status: "mixed",
            submitted: rows.reduce((a, r) => a + r.submitted, 0),
            aiScreened: rows.reduce((a, r) => a + r.aiScreened, 0),
            aiScreenedPct: 0,
            interviewed: rows.reduce((a, r) => a + r.interviewed, 0),
            interviewedPct: 0,
            offered: rows.reduce((a, r) => a + r.offered, 0),
            offeredPct: 0,
            hired: rows.reduce((a, r) => a + r.hired, 0),
            hiredPct: 0,
        };
        if (agg.submitted > 0) {
            agg.aiScreenedPct = Math.round((agg.aiScreened / agg.submitted) * 100);
            agg.interviewedPct = Math.round((agg.interviewed / agg.submitted) * 100);
            agg.offeredPct = Math.round((agg.offered / agg.submitted) * 100);
            agg.hiredPct = Math.round((agg.hired / agg.submitted) * 100);
        }
        return (
            <div className="space-y-6">
                <JobFunnel row={agg} />
                <div className="border-t border-slate-100 pt-4 space-y-6">
                    {rows.map((r) => <JobFunnel key={r.jobId} row={r} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {rows.map((r) => <JobFunnel key={r.jobId} row={r} />)}
        </div>
    );
}
