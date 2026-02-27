"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BarChart3,
    Clock,
    DollarSign,
    TrendingUp,
    Users,
    Briefcase,
    Target,
    CheckCircle,
} from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface Analytics {
    funnel: { submitted: number; reviewing: number; interview: number; offered: number; hired: number; rejected: number };
    timeToHire: { average: number; fastest: number; slowest: number; byJob: { jobTitle: string; days: number }[] };
    costPerHire: { average: number; total: number; byJob: { jobTitle: string; cost: number }[] };
    overview: { totalJobs: number; activeJobs: number; totalCandidates: number; totalPlacements: number; fillRate: number };
}

interface AnalyticsDashboardProps {
    analytics: Analytics | null;
    dict: any;
}

function formatSEK(amount: number): string {
    return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(amount);
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.max(4, (value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground w-24 text-right">{label}</span>
            <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
                <div
                    className={`h-full rounded-lg transition-all duration-500 ${color}`}
                    style={{ width: `${pct}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                    {value}
                </span>
            </div>
        </div>
    );
}

export function AnalyticsDashboard({ analytics, dict }: AnalyticsDashboardProps) {
    const { t } = useTranslations();

    if (!analytics) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">{t("analytics.pageTitle")}</h1>
                    <p className="text-muted-foreground">{t("analytics.noDataYet")}</p>
                </div>
            </div>
        );
    }

    const { funnel, timeToHire, costPerHire, overview } = analytics;
    const funnelMax = Math.max(funnel.submitted, funnel.reviewing, funnel.interview, funnel.offered, funnel.hired, funnel.rejected, 1);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{t("analytics.pageTitle")}</h1>
                <p className="text-muted-foreground">{t("analytics.pageSubtitle")}</p>
            </div>

            {/* Overview stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center">
                            <Briefcase className="h-5 w-5 text-brand-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">{t("analytics.totalJobs")}</p>
                            <p className="text-xl font-bold">{overview.totalJobs}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">{t("analytics.totalCandidates")}</p>
                            <p className="text-xl font-bold">{overview.totalCandidates}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-success-50 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-success-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">{t("analytics.totalPlacements")}</p>
                            <p className="text-xl font-bold">{overview.totalPlacements}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Target className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">{t("analytics.fillRate")}</p>
                            <p className="text-xl font-bold">{overview.fillRate}%</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-warning-50 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-warning-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">{t("analytics.activeJobs")}</p>
                            <p className="text-xl font-bold">{overview.activeJobs}</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Recruitment Funnel */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-brand-600" />
                            {t("analytics.recruitmentFunnel")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <FunnelBar label={t("analytics.funnelSubmitted")} value={funnel.submitted} max={funnelMax} color="bg-slate-400" />
                        <FunnelBar label={t("analytics.funnelReviewing")} value={funnel.reviewing} max={funnelMax} color="bg-blue-400" />
                        <FunnelBar label={t("analytics.funnelInterview")} value={funnel.interview} max={funnelMax} color="bg-brand-400" />
                        <FunnelBar label={t("analytics.funnelOffered")} value={funnel.offered} max={funnelMax} color="bg-purple-400" />
                        <FunnelBar label={t("analytics.funnelHired")} value={funnel.hired} max={funnelMax} color="bg-success-400" />
                        <FunnelBar label={t("analytics.funnelRejected")} value={funnel.rejected} max={funnelMax} color="bg-danger-400" />

                        {overview.totalCandidates > 0 && (
                            <div className="pt-3 border-t border-border">
                                <p className="text-xs text-muted-foreground">
                                    {t("analytics.conversionRate")}: <span className="font-bold text-foreground">{overview.totalCandidates > 0 ? Math.round((funnel.hired / overview.totalCandidates) * 100) : 0}%</span> {t("analytics.fromSubmittedToHired")}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Time to Hire */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-brand-600" />
                            {t("analytics.timeToHire")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="text-center p-3 bg-muted rounded-lg">
                                <p className="text-2xl font-bold text-brand-600">{timeToHire.average}</p>
                                <p className="text-xs text-muted-foreground">{t("analytics.avgDays")}</p>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                                <p className="text-2xl font-bold text-success-600">{timeToHire.fastest}</p>
                                <p className="text-xs text-muted-foreground">{t("analytics.fastestDays")}</p>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                                <p className="text-2xl font-bold text-warning-600">{timeToHire.slowest}</p>
                                <p className="text-xs text-muted-foreground">{t("analytics.slowestDays")}</p>
                            </div>
                        </div>

                        {timeToHire.byJob.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("analytics.byJob")}</p>
                                {timeToHire.byJob.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                                        <span className="text-sm truncate flex-1">{item.jobTitle}</span>
                                        <Badge variant="outline" className="ml-2">{item.days} {t("analytics.daysUnit")}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}

                        {timeToHire.byJob.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">{t("analytics.noPlacementsForTTH")}</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Cost per Hire */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-brand-600" />
                        {t("analytics.costPerHire")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center p-4 bg-muted rounded-lg">
                            <p className="text-2xl font-bold text-brand-600">{formatSEK(costPerHire.average)}</p>
                            <p className="text-xs text-muted-foreground">{t("analytics.avgCostPerHire")}</p>
                        </div>
                        <div className="text-center p-4 bg-muted rounded-lg">
                            <p className="text-2xl font-bold">{formatSEK(costPerHire.total)}</p>
                            <p className="text-xs text-muted-foreground">{t("analytics.totalRecruitmentCost")}</p>
                        </div>
                    </div>

                    {costPerHire.byJob.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("analytics.byJob")}</p>
                            {costPerHire.byJob.map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                                    <span className="text-sm truncate flex-1">{item.jobTitle}</span>
                                    <span className="text-sm font-medium ml-2">{formatSEK(item.cost)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {costPerHire.byJob.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">{t("analytics.noCostData")}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
