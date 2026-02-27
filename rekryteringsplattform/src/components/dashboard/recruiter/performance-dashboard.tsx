"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    Target,
    Star,
    Wallet,
    Clock,
    TrendingUp,
    FileCheck,
    BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

interface PerformanceData {
    overview: {
        totalCandidates: number;
        activeMandates: number;
        totalPlacements: number;
        rating: number;
        revenue: number;
        successRate: number;
    };
    monthly: { month: string; submitted: number; hired: number; revenue: number }[];
    statusBreakdown: Record<string, number>;
    ratings: { rating: number; review: string | null; date: string; candidateName: string }[];
    timeToFill: { average: number; byJob: { jobTitle: string; days: number }[] };
}

function formatSEK(amount: number): string {
    return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(amount);
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
    return (
        <div className="w-full h-6 bg-slate-100 rounded-md overflow-hidden relative">
            <div className={`h-full rounded-md ${color}`} style={{ width: `${pct}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                {value}
            </span>
        </div>
    );
}

export function RecruiterPerformanceDashboard({ data }: { data: PerformanceData }) {
    const { overview, monthly, statusBreakdown, ratings, timeToFill } = data;
    const { t } = useTranslations();

    const monthlyMax = Math.max(...monthly.map(m => m.submitted), 1);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{t("performance.pageTitle")}</h1>
                <p className="text-muted-foreground">{t("performance.pageSubtitle")}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="p-4">
                    <div className="flex flex-col items-center text-center">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-xl font-bold">{overview.totalCandidates}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("performance.totalCandidates")}</p>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex flex-col items-center text-center">
                        <div className="h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center mb-2">
                            <FileCheck className="h-5 w-5 text-brand-600" />
                        </div>
                        <p className="text-xl font-bold">{overview.activeMandates}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("performance.activeMandates")}</p>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex flex-col items-center text-center">
                        <div className="h-10 w-10 rounded-lg bg-success-50 flex items-center justify-center mb-2">
                            <Target className="h-5 w-5 text-success-600" />
                        </div>
                        <p className="text-xl font-bold">{overview.totalPlacements}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("performance.placements")}</p>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex flex-col items-center text-center">
                        <div className="h-10 w-10 rounded-lg bg-warning-50 flex items-center justify-center mb-2">
                            <Star className="h-5 w-5 text-warning-600" />
                        </div>
                        <p className="text-xl font-bold">{overview.rating > 0 ? overview.rating.toFixed(1) : "—"}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("performance.avgRating")}</p>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex flex-col items-center text-center">
                        <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center mb-2">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                        </div>
                        <p className="text-xl font-bold">{overview.successRate}%</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("performance.successRate")}</p>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex flex-col items-center text-center">
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
                            <Wallet className="h-5 w-5 text-emerald-600" />
                        </div>
                        <p className="text-xl font-bold">{formatSEK(overview.revenue)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("performance.totalRevenue")}</p>
                    </div>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Monthly Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-brand-600" />
                            {t("performance.monthlyActivity")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="grid grid-cols-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                <span>{t("performance.monthLabel")}</span>
                                <span>{t("performance.submittedLabel")}</span>
                                <span>{t("performance.hiredLabel")}</span>
                                <span>{t("performance.revenueLabel")}</span>
                            </div>
                            {monthly.map((m, i) => (
                                <div key={i} className="grid grid-cols-4 items-center gap-2">
                                    <span className="text-xs font-medium capitalize">{m.month}</span>
                                    <MiniBar value={m.submitted} max={monthlyMax} color="bg-blue-300" />
                                    <MiniBar value={m.hired} max={Math.max(...monthly.map(x => x.hired), 1)} color="bg-success-300" />
                                    <span className="text-xs font-medium text-right">{formatSEK(m.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Time to Fill */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-brand-600" />
                            {t("performance.timeToFill")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center p-4 bg-muted rounded-lg mb-4">
                            <p className="text-3xl font-bold text-brand-600">{timeToFill.average}</p>
                            <p className="text-xs text-muted-foreground">{t("performance.avgDaysToFill")}</p>
                        </div>

                        {timeToFill.byJob.length > 0 ? (
                            <div className="space-y-2">
                                {timeToFill.byJob.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                                        <span className="text-sm truncate flex-1">{item.jobTitle}</span>
                                        <Badge variant="outline" className="ml-2">{item.days} {t("analytics.daysUnit")}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">{t("performance.noPlacementsYet")}</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Client Ratings & Reviews */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-warning-500" />
                        {t("performance.clientRatings")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {ratings.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">{t("performance.noRatingsYet")}</p>
                    ) : (
                        <div className="space-y-3">
                            {ratings.map((r, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                                    <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star
                                                key={star}
                                                className={cn(
                                                    "h-3.5 w-3.5",
                                                    star <= r.rating
                                                        ? "fill-warning-500 text-warning-500"
                                                        : "text-slate-200"
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{r.candidateName}</p>
                                        {r.review && <p className="text-xs text-muted-foreground mt-0.5 italic">&quot;{r.review}&quot;</p>}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                        {new Date(r.date).toLocaleDateString("sv-SE")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Status Breakdown */}
            {Object.keys(statusBreakdown).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("performance.candidateStatusBreakdown")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(statusBreakdown)
                                .sort((a, b) => b[1] - a[1])
                                .map(([status, count]) => (
                                    <Badge key={status} variant="outline" className="gap-1.5 py-1.5 px-3">
                                        <span className="font-bold">{count}</span>
                                        <span className="text-muted-foreground">{status.replace(/_/g, " ")}</span>
                                    </Badge>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
