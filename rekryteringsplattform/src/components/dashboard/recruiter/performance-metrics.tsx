import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, Shield, Users, Briefcase, FileCheck, CalendarClock, UserCheck, Target, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { createTranslator } from "@/i18n/server";

interface RecruiterOverviewProps {
    openJobs: number;
    stats: { activeMandates: number; candidates: number; inInterview: number; hired: number; movedToInterview: number };
    rates: { interviewRate: number; hireRate: number; submitted: number; candidatesHired: number };
    metrics: {
        rating: number;
        avgTimeToHireDays: number;
        activePlacements: number;
        guaranteeSuccessRate: number | null;
    } | null;
}

function Tile({
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
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 h-full">
            <div className={cn("p-2 rounded-md", color)}>
                <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground break-words">{label}</p>
                <p className="text-lg font-bold leading-tight">
                    {value}{suffix && <span className="text-sm font-normal text-muted-foreground ml-0.5">{suffix}</span>}
                </p>
                {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
            </div>
        </div>
    );
}

export async function RecruiterOverview({ stats, rates, metrics, openJobs }: RecruiterOverviewProps) {
    const t = await createTranslator();
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-brand-600" />
                    {t("recruiter.perfTitle")}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Hire rate lives ONLY in the "Hire rate" tile — client request 2026-07-10:
                    it was shown 3x (tile + box + bar). Don't add a metrics.hireRate tile. */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    <Tile
                        label={t("recruiter.activeMandates")}
                        value={stats.activeMandates}
                        icon={FileCheck}
                        color="bg-brand-600"
                    />
                    <Tile
                        label={t("recruiter.presentedCandidates")}
                        value={stats.candidates}
                        icon={Users}
                        color="bg-blue-600"
                    />
                    <Tile
                        label={t("recruiter.inInterview")}
                        value={stats.inInterview}
                        icon={CalendarClock}
                        color="bg-amber-600"
                    />
                    <Tile
                        label={t("recruiter.hired")}
                        value={stats.hired}
                        icon={UserCheck}
                        color="bg-emerald-600"
                    />
                    <Tile
                        label={t("recruiter.rateInterview")}
                        value={`${rates.interviewRate}%`}
                        icon={CalendarClock}
                        color="bg-blue-600"
                        description={t("recruiter.rateInterviewSub", {
                            moved: stats.movedToInterview,
                            submitted: rates.submitted,
                        })}
                    />
                    <Tile
                        label={t("recruiter.rateHire")}
                        value={`${rates.hireRate}%`}
                        icon={Target}
                        color="bg-green-600"
                        description={t("recruiter.rateHireSub", {
                            hired: rates.candidatesHired,
                            submitted: rates.submitted,
                        })}
                    />
                    <Tile
                        label={t("recruiter.perfAvgTimeToHire")}
                        value={metrics ? metrics.avgTimeToHireDays : "—"}
                        suffix={metrics ? t("recruiter.perfDaysSuffix") : undefined}
                        icon={Clock}
                        color="bg-blue-600"
                    />
                    <Tile
                        label={t("recruiter.perfOpenJobs")}
                        value={openJobs}
                        icon={Briefcase}
                        color="bg-amber-600"
                    />
                    <Tile
                        label={t("recruiter.perfActiveGuarantees")}
                        value={metrics ? metrics.activePlacements : "—"}
                        icon={Shield}
                        color="bg-emerald-600"
                    />
                    <Tile
                        label={t("recruiter.perfGuaranteeResult")}
                        value={metrics?.guaranteeSuccessRate ?? "—"}
                        suffix={metrics?.guaranteeSuccessRate != null ? "%" : undefined}
                        icon={Shield}
                        color="bg-green-600"
                    />
                    <Tile
                        label={t("recruiter.perfRating")}
                        value={metrics && metrics.rating > 0 ? metrics.rating.toFixed(1) : "—"}
                        suffix={metrics && metrics.rating > 0 ? "/5" : ""}
                        icon={Star}
                        color="bg-purple-600"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
