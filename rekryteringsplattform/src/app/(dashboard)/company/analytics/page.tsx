"use client";

import { useState, useEffect } from "react";
import { BarChart3, Download, Loader2, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HiringFunnel } from "@/components/analytics/hiring-funnel";
import { TimeToHireCard } from "@/components/analytics/time-to-hire-card";
import { CostAnalysisCard } from "@/components/analytics/cost-analysis-card";
import { RecruiterPerformanceTable } from "@/components/analytics/recruiter-performance-table";
import { formatCurrency } from "@/lib/utils";

interface AnalyticsData {
    funnel: any[];
    timings: any[];
    costs: any[];
    recruiterPerf: any[];
    summary: {
        totalJobs: number;
        activeJobs: number;
        totalCandidates: number;
        totalHired: number;
        avgDaysToHire: number | null;
        avgDaysToInterview: number | null;
        totalSaving: number;
        totalRecruiTo: number;
        currency: string;
    };
}

function SummaryKpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="p-5 rounded-xl border border-slate-100 bg-white space-y-1">
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">{label}</p>
            <p className="text-2xl font-black text-slate-900">{value}</p>
            {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
    );
}

export default function CompanyAnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedJobId, setSelectedJobId] = useState<string | undefined>(undefined);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const url = selectedJobId
                    ? `/api/analytics/company?jobId=${selectedJobId}`
                    : "/api/analytics/company";
                const res = await fetch(url);
                if (!res.ok) throw new Error("Failed to load analytics");
                setData(await res.json());
            } catch (e) {
                setError(e instanceof Error ? e.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        }
        setLoading(true);
        load();
    }, [selectedJobId]);

    async function handleExport() {
        setExporting(true);
        try {
            const url = selectedJobId
                ? `/api/analytics/company/export?jobId=${selectedJobId}`
                : "/api/analytics/company/export";
            const res = await fetch(url);
            if (!res.ok) return;
            const blob = await res.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `recruito-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
        } finally {
            setExporting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="py-24 text-center text-slate-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>{error ?? "No data available"}</p>
            </div>
        );
    }

    const { summary, funnel } = data;
    const currency = summary.currency ?? "SEK";

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-brand-600" />
                        Recruitment Analytics
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        ROI and performance across all your recruitment activity
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={exporting}
                    className="gap-2"
                >
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export CSV
                </Button>
            </div>

            {/* Job filter */}
            {funnel.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500">Filter by job:</span>
                    <button
                        onClick={() => setSelectedJobId(undefined)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            !selectedJobId
                                ? "bg-brand-600 text-white border-brand-600"
                                : "border-slate-200 text-slate-600 hover:border-brand-300"
                        }`}
                    >
                        All jobs
                    </button>
                    {funnel.map((f) => (
                        <button
                            key={f.jobId}
                            onClick={() => setSelectedJobId(f.jobId)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                selectedJobId === f.jobId
                                    ? "bg-brand-600 text-white border-brand-600"
                                    : "border-slate-200 text-slate-600 hover:border-brand-300"
                            }`}
                        >
                            {f.jobTitle}
                        </button>
                    ))}
                </div>
            )}

            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryKpi label="Active Jobs" value={summary.activeJobs} sub={`${summary.totalJobs} total`} />
                <SummaryKpi label="Candidates" value={summary.totalCandidates} sub="across all jobs" />
                <SummaryKpi
                    label="Avg Time to Hire"
                    value={summary.avgDaysToHire != null ? `${summary.avgDaysToHire}d` : "—"}
                    sub="platform avg: 34d"
                />
                <SummaryKpi
                    label="Total Saving"
                    value={summary.totalSaving > 0 ? formatCurrency(summary.totalSaving, currency) : "—"}
                    sub="vs traditional agencies"
                />
            </div>

            {/* A) Hiring Funnel */}
            <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
                <CardContent className="p-6 space-y-4">
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
                            A · Hiring Funnel
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Candidate conversion at each stage</p>
                    </div>
                    <HiringFunnel data={data.funnel} selectedJobId={selectedJobId} />
                </CardContent>
            </Card>

            {/* B + C grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
                    <CardContent className="p-6 space-y-4">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
                                B · Time to Hire
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">Speed benchmarked against platform average</p>
                        </div>
                        <TimeToHireCard
                            timings={data.timings}
                            avgDaysToHire={summary.avgDaysToHire}
                            avgDaysToInterview={summary.avgDaysToInterview}
                        />
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
                    <CardContent className="p-6 space-y-4">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
                                C · Cost Analysis
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">Recruito fee vs traditional 20% agency fee</p>
                        </div>
                        <CostAnalysisCard
                            costs={data.costs}
                            totalSaving={summary.totalSaving}
                            totalRecruiTo={summary.totalRecruiTo}
                            currency={currency}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* D) Recruiter Performance */}
            <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
                <CardContent className="p-6 space-y-4">
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
                            D · Recruiter Performance
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Response time, quality, and conversion across all assigned recruiters</p>
                    </div>
                    <RecruiterPerformanceTable data={data.recruiterPerf} />
                </CardContent>
            </Card>
        </div>
    );
}
