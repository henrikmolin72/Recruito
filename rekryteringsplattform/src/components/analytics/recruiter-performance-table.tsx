"use client";

import { UserCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RecruiterRow {
    recruiterId: string;
    name: string;
    jobCount: number;
    candidateCount: number;
    hiredCount: number;
    conversionRate: number;
    avgAiScore: number | null;
    avgDaysToFirstCandidate: number | null;
}

interface RecruiterPerformanceTableProps {
    data: RecruiterRow[];
}

function ScoreBadge({ score }: { score: number | null }) {
    if (score == null) return <span className="text-xs text-slate-400">—</span>;
    const variant = score > 70 ? "success" : score >= 40 ? "warning" : "danger";
    return <Badge variant={variant} className="text-[10px]">{score}/100</Badge>;
}

function ConversionBar({ pct }: { pct: number }) {
    const color = pct >= 20 ? "bg-success-400" : pct >= 10 ? "bg-amber-400" : "bg-slate-300";
    return (
        <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{pct}%</span>
        </div>
    );
}

export function RecruiterPerformanceTable({ data }: RecruiterPerformanceTableProps) {
    if (data.length === 0) {
        return <p className="text-sm text-slate-400 italic py-4">No recruiter data yet.</p>;
    }

    // Sort by hiredCount desc
    const sorted = [...data].sort((a, b) => b.hiredCount - a.hiredCount || b.conversionRate - a.conversionRate);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 px-3">
                <span>Recruiter</span>
                <span>Jobs</span>
                <span>Candidates</span>
                <span>Hired</span>
                <span>AI Score</span>
                <span>Conversion</span>
            </div>

            {/* Rows */}
            {sorted.map((r, i) => (
                <div
                    key={r.recruiterId}
                    className={cn(
                        "grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-center rounded-xl border px-3 py-3",
                        i === 0 ? "border-success-200 bg-success-50/40" : "border-slate-100 bg-white"
                    )}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        {i === 0 && <Star className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                        <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-brand-700">
                                {r.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                            </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-800 truncate">{r.name}</span>
                    </div>
                    <span className="text-xs text-slate-600 text-center">{r.jobCount}</span>
                    <span className="text-xs text-slate-600 text-center">{r.candidateCount}</span>
                    <span className="text-xs font-bold text-slate-800 text-center">{r.hiredCount}</span>
                    <div className="flex justify-center">
                        <ScoreBadge score={r.avgAiScore} />
                    </div>
                    <ConversionBar pct={r.conversionRate} />
                </div>
            ))}

            <p className="text-[10px] text-slate-400 px-3">
                Conversion = hired ÷ total candidates submitted. AI Score = avg score on shortlisted candidates.
            </p>
        </div>
    );
}
