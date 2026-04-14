"use client";

import { Clock, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimingRow {
    jobId: string;
    jobTitle: string;
    daysToInterview: number | null;
    daysToOffer: number | null;
    daysToHire: number | null;
    publishToFirst: number | null;
}

interface TimeToHireCardProps {
    timings: TimingRow[];
    avgDaysToHire: number | null;
    avgDaysToInterview: number | null;
}

// Industry benchmark (placeholder — ideally pulled from aggregated platform data)
const BENCHMARK_DAYS_TO_HIRE = 34;
const BENCHMARK_DAYS_TO_INTERVIEW = 12;

function PhaseBar({ label, days, benchmarkDays, color }: { label: string; days: number | null; benchmarkDays: number; color: string }) {
    if (days == null) return null;
    const pct = Math.min(100, Math.round((days / Math.max(days, benchmarkDays)) * 100));
    const benchmarkPct = Math.min(100, Math.round((benchmarkDays / Math.max(days, benchmarkDays)) * 100));
    const better = days <= benchmarkDays;

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">{label}</span>
                <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-bold", better ? "text-success-700" : "text-amber-700")}>
                        {days}d
                    </span>
                    <span className="text-[10px] text-slate-400">vs {benchmarkDays}d avg</span>
                    {better && <TrendingDown className="h-3 w-3 text-success-500" />}
                </div>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden relative">
                <div
                    className={cn("h-full rounded-full transition-all duration-500", color)}
                    style={{ width: `${pct}%` }}
                />
                {/* Benchmark marker */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
                    style={{ left: `${benchmarkPct}%` }}
                />
            </div>
        </div>
    );
}

export function TimeToHireCard({ timings, avgDaysToHire, avgDaysToInterview }: TimeToHireCardProps) {
    const hiredCount = timings.length;
    const fasterThanBenchmark = avgDaysToHire != null && avgDaysToHire < BENCHMARK_DAYS_TO_HIRE;

    return (
        <div className="space-y-5">
            {/* Big number */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-3xl font-black text-slate-900">
                            {avgDaysToHire != null ? `${avgDaysToHire}d` : "—"}
                        </p>
                        <p className="text-xs text-slate-500">avg time to hire</p>
                    </div>
                </div>
                {fasterThanBenchmark && (
                    <div className="rounded-lg bg-success-50 border border-success-200 px-3 py-2 text-right">
                        <p className="text-xs font-bold text-success-700">
                            {BENCHMARK_DAYS_TO_HIRE - (avgDaysToHire ?? 0)}d faster
                        </p>
                        <p className="text-[10px] text-success-600">than platform avg</p>
                    </div>
                )}
            </div>

            {/* Phase breakdown */}
            <div className="space-y-3">
                <PhaseBar
                    label="Submission → Interview"
                    days={avgDaysToInterview}
                    benchmarkDays={BENCHMARK_DAYS_TO_INTERVIEW}
                    color="bg-brand-400"
                />
                <PhaseBar
                    label="Total: Submission → Hired"
                    days={avgDaysToHire}
                    benchmarkDays={BENCHMARK_DAYS_TO_HIRE}
                    color="bg-blue-400"
                />
            </div>

            {/* Per-job table */}
            {timings.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Per hire ({hiredCount} total)
                    </p>
                    <div className="space-y-1.5">
                        {timings.slice(0, 5).map((t, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-600 truncate max-w-[180px]">{t.jobTitle}</span>
                                <span className="font-bold text-slate-800 shrink-0">
                                    {t.daysToHire != null ? `${t.daysToHire}d` : "—"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {hiredCount === 0 && (
                <p className="text-xs text-slate-400 italic">No completed hires yet.</p>
            )}
        </div>
    );
}
