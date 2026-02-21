import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Briefcase, Users, Clock, CheckCircle, TrendingDown } from "lucide-react";
import { getCompanyDashboard } from "@/lib/actions/company";
import { formatDate } from "@/lib/utils";
import { getTierForPlacementCount, placementsUntilNextTier, PRICING_TIERS } from "@/lib/pricing";
import { getDictionary, createTranslator } from "@/i18n/server";

export default async function CompanyDashboard() {
  const { company, jobs, stats, recentActivity } = await getCompanyDashboard();
  const currentTier = getTierForPlacementCount(stats.recentPlacements);
  const nextTierInfo = placementsUntilNextTier(stats.recentPlacements);
  const dict = await getDictionary();
  const t = await createTranslator();
  const c = dict.company;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{c.dashboardTitle}</h1>
        <p className="text-muted-foreground">{c.welcomeBack.replace("{name}", company.company_name)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title={c.activeJobs} value={stats.activeJobs} icon={Briefcase} />
        <StatsCard title={c.presentedCandidates} value={stats.candidates} icon={Users} />
        <StatsCard title={c.ongoingInterviews} value={stats.interviews} icon={Clock} />
        <StatsCard title={c.successfulPlacements} value={stats.placements} icon={CheckCircle} description={c.totalCount} />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{c.pricingAgreement}</p>
            <p className="text-2xl font-bold mt-1">{currentTier.feePercentage}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t(currentTier.labelKey)} ({stats.recentPlacements} {c.placementsLabel})
            </p>
            {nextTierInfo && (
              <p className="text-xs text-brand-600 mt-1">
                {nextTierInfo.needed} {c.placementsLabel} → {t(nextTierInfo.nextTier.labelKey)} ({nextTierInfo.nextTier.feePercentage}%)
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-brand-50 flex items-center justify-center">
            <TrendingDown className="h-6 w-6 text-brand-600" />
          </div>
        </div>
        <div className="flex gap-4 mt-4 pt-4 border-t border-border">
          {PRICING_TIERS.slice().reverse().map((tier) => (
            <div key={tier.labelKey} className={`flex-1 text-center p-2 rounded-lg ${tier.labelKey === currentTier.labelKey ? "bg-brand-50 ring-1 ring-brand-200" : "bg-muted"}`}>
              <p className="text-xs text-muted-foreground">{t(tier.labelKey)}</p>
              <p className="text-sm font-bold">{tier.feePercentage}%</p>
              <p className="text-[10px] text-muted-foreground">{tier.minPlacements}+ {c.placementsLabel}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{c.yourJobs}</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {c.noJobsYet}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableTitle}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableLocation}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableStatus}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableCompleted}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableRecruiters}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableCandidates}</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job: any) => (
                    <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 font-medium">{job.title}</td>
                      <td className="py-3 text-muted-foreground">{job.location}</td>
                      <td className="py-3"><StatusBadge status={job.status} /></td>
                      <td className="py-3 text-muted-foreground">{formatDate(job.created_at)}</td>
                      <td className="py-3"><Badge variant="outline">{job.recruiters_count}/{job.max_recruiters}</Badge></td>
                      <td className="py-3">{job.candidates_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{c.recentActivity}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity: any, i: number) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="h-2 w-2 rounded-full bg-brand-500 mt-2 shrink-0" />
                  <div>
                    <p className="text-sm">{activity.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{c.noActivityYet}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
