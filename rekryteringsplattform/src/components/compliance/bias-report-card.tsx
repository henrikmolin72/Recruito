"use client";

import { useState, useEffect } from "react";
import { Scale, AlertTriangle, BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BiasFlag {
    type: string;
    severity: "warning" | "critical";
    detail: string;
}

interface BiasReportData {
    id: string;
    job_id: string;
    report_date: string;
    total_screened: number;
    total_shortlisted: number;
    score_distribution: Record<string, number>;
    experience_distribution: Record<string, { screened: number; shortlisted: number }>;
    location_distribution: Record<string, { screened: number; shortlisted: number }>;
    flags: BiasFlag[];
}

interface BiasReportCardProps {
    jobId: string;
    className?: string;
}

function DistributionBar({ label, value, max }: { label: string; value: number; max: number }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 w-20 shrink-0 truncate">{label}</span>
            <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs font-semibold text-slate-600 w-8 text-right">{value}</span>
        </div>
    );
}

export function BiasReportCard({ jobId, className }: BiasReportCardProps) {
    const [report, setReport] = useState<BiasReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchReport() {
            try {
                const res = await fetch(`/api/compliance/bias-report?jobId=${jobId}`);
                if (res.status === 404) {
                    setReport(null);
                    return;
                }
                if (!res.ok) throw new Error("Failed to load bias report");
                const data = await res.json();
                setReport(data.report ?? null);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        }
        fetchReport();
    }, [jobId]);

    if (loading) {
        return (
            <Card className={cn("border-slate-200", className)}>
                <CardContent className="p-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading bias report...
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className={cn("border-red-200", className)}>
                <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
            </Card>
        );
    }

    if (!report) {
        return (
            <Card className={cn("border-slate-200", className)}>
                <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Scale className="h-4 w-4 text-slate-400" />
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">
                            AI Bias Report
                        </h4>
                    </div>
                    <p className="text-sm text-slate-500">
                        No bias report available yet. A report is generated after the first AI screenings are completed.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const scoreEntries = Object.entries(report.score_distribution || {}).sort(
        ([a], [b]) => a.localeCompare(b)
    );
    const maxScore = Math.max(...scoreEntries.map(([, v]) => v), 1);

    const hasFlags = report.flags && report.flags.length > 0;
    const shortlistRate =
        report.total_screened > 0
            ? Math.round((report.total_shortlisted / report.total_screened) * 100)
            : 0;

    return (
        <Card className={cn("border-slate-200", hasFlags && "border-amber-200", className)}>
            <CardContent className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-blue-600" />
                        <h4 className="text-xs font-black uppercase tracking-widest text-blue-700">
                            AI Bias Report
                        </h4>
                    </div>
                    <Badge
                        variant={hasFlags ? "warning" : "outline"}
                        className="text-[10px]"
                    >
                        {hasFlags ? `${report.flags.length} flag(s)` : "No flags"}
                    </Badge>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="text-2xl font-bold text-slate-900">{report.total_screened}</p>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Screened</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="text-2xl font-bold text-slate-900">{report.total_shortlisted}</p>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Shortlisted</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="text-2xl font-bold text-slate-900">{shortlistRate}%</p>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Rate</p>
                    </div>
                </div>

                {/* Score distribution */}
                {scoreEntries.length > 0 && (
                    <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                            <BarChart3 className="h-3 w-3" /> Score Distribution
                        </p>
                        <div className="space-y-1.5">
                            {scoreEntries.map(([range, count]) => (
                                <DistributionBar key={range} label={range} value={count} max={maxScore} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Flags */}
                {hasFlags && (
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-amber-600">
                            Detected Flags
                        </p>
                        {report.flags.map((flag, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "rounded-lg border p-3 flex items-start gap-2",
                                    flag.severity === "critical"
                                        ? "border-red-200 bg-red-50"
                                        : "border-amber-200 bg-amber-50"
                                )}
                            >
                                <AlertTriangle
                                    className={cn(
                                        "h-3.5 w-3.5 mt-0.5 shrink-0",
                                        flag.severity === "critical" ? "text-red-600" : "text-amber-600"
                                    )}
                                />
                                <div className="text-xs">
                                    <p className={cn(
                                        "font-bold",
                                        flag.severity === "critical" ? "text-red-800" : "text-amber-800"
                                    )}>
                                        {flag.type}
                                    </p>
                                    <p className={cn(
                                        flag.severity === "critical" ? "text-red-700" : "text-amber-700"
                                    )}>
                                        {flag.detail}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                    Report date: {report.report_date} · Aggregated data only — no individual PII.
                </p>
            </CardContent>
        </Card>
    );
}
