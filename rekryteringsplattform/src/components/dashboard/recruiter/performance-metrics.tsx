import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Clock, TrendingUp, Shield, Users, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { createTranslator } from "@/i18n/server";

interface PerformanceMetricsProps {
    openJobs: number;
    metrics: {
        rating: number;
        hireRate: number;
        avgTimeToHireDays: number;
        candidatesSubmitted: number;
        candidatesHired: number;
        activePlacements: number;
        guaranteeSuccessRate: number;
    };
}

function MetricCard({
    label,
    value,
    suffix,
    icon: Icon,
    color,
    description,
}: {
    label: string;
    value: string | number;
    suffix?: string;
    icon: React.ElementType;
    color: string;
    description?: string;
}) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className={cn("p-2 rounded-md", color)}>
                <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
                <p className="text-lg font-bold leading-tight">
                    {value}{suffix && <span className="text-sm font-normal text-muted-foreground ml-0.5">{suffix}</span>}
                </p>
                {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
            </div>
        </div>
    );
}

function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
    const pct = Math.min(Math.max((value / max) * 100, 0), 100);
    return (
        <div className="h-2 w-full rounded-full bg-muted">
            <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
        </div>
    );
}

export async function PerformanceMetrics({ metrics, openJobs }: PerformanceMetricsProps) {
    const t = await createTranslator();
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-brand-600" />
                    {t("recruiter.perfTitle")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <MetricCard
                        label={t("recruiter.perfHireRate")}
                        value={metrics.hireRate}
                        suffix="%"
                        icon={Target}
                        color="bg-brand-600"
                        description={t("recruiter.perfHiredOf", { hired: metrics.candidatesHired, submitted: metrics.candidatesSubmitted })}
                    />
                    <MetricCard
                        label={t("recruiter.perfAvgTimeToHire")}
                        value={metrics.avgTimeToHireDays}
                        suffix={t("recruiter.perfDaysSuffix")}
                        icon={Clock}
                        color="bg-blue-600"
                    />
                    <MetricCard
                        label={t("recruiter.perfOpenJobs")}
                        value={openJobs}
                        icon={Briefcase}
                        color="bg-amber-600"
                    />
                    <MetricCard
                        label={t("recruiter.perfActiveGuarantees")}
                        value={metrics.activePlacements}
                        icon={Shield}
                        color="bg-emerald-600"
                    />
                    <MetricCard
                        label={t("recruiter.perfGuaranteeResult")}
                        value={metrics.guaranteeSuccessRate}
                        suffix="%"
                        icon={Shield}
                        color="bg-green-600"
                    />
                    <MetricCard
                        label={t("recruiter.perfRating")}
                        value={metrics.rating > 0 ? metrics.rating.toFixed(1) : "—"}
                        suffix={metrics.rating > 0 ? "/5" : ""}
                        icon={Users}
                        color="bg-purple-600"
                    />
                </div>

                {/* Hire rate progress */}
                <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{t("recruiter.perfConversionRate")}</span>
                        <span className="font-medium">{metrics.hireRate}%</span>
                    </div>
                    <ProgressBar value={metrics.hireRate} color="bg-brand-600" />
                </div>

            </CardContent>
        </Card>
    );
}
