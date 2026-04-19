import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Briefcase, Users, Clock, CheckCircle } from "lucide-react";
import { getCompanyDashboard } from "@/lib/actions/company";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { getDictionary, createTranslator } from "@/i18n/server";

export default async function CompanyDashboard() {
  const { company, jobs, stats, recentActivity } = await getCompanyDashboard();
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
        <StatsCard title={c.activeJobs} value={stats.activeJobs} icon={Briefcase} description={`Draft ${stats.draftJobs} / Closed ${stats.closedJobs}`} />
        <StatsCard title={c.presentedCandidates} value={stats.candidates} icon={Users} />
        <StatsCard title={c.ongoingInterviews} value={stats.interviews} icon={Clock} />
        <StatsCard title={c.successfulPlacements} value={stats.placements} icon={CheckCircle} description={c.totalCount} />
      </div>

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
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold text-foreground">{c.tableTitle}</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">{c.tableCity || "City"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">{c.tableSalary || "Salary"}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{c.tableCandidates}</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">{c.tableFee || "Fee"}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{c.tableGuarantee || "Guarantee"}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{c.tableRecruiters}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{c.tableStatus}</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">{c.tablePublished || "Published"}</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job: any) => {
                    const isLive = job.status === "active";
                    const isPaused = job.status === "paused";
                    const statusLabel = isLive ? (c.statusLive || "Live") : isPaused ? (c.statusPaused || "Paused") : job.status;
                    const statusColor = isLive ? "text-success-500" : isPaused ? "text-danger-500" : "text-muted-foreground";
                    const salaryRange = job.salary_min
                      ? `${formatCurrency(job.salary_min, job.salary_currency || "EUR")}${job.salary_max ? ` - ${formatCurrency(job.salary_max, job.salary_currency || "EUR")}` : ""}`
                      : "—";
                    const fee = (job.salary_min && job.fee_percentage)
                      ? formatCurrency(Math.round((job.salary_max ? (job.salary_min + job.salary_max) / 2 : job.salary_min) * (job.fee_percentage / 100)), job.salary_currency || "EUR")
                      : "—";
                    const guarantee = job.guarantee_period_months
                      ? (job.guarantee_period_months === 1
                        ? (c.guaranteeMonths || "{count} month").replace("{count}", String(job.guarantee_period_months))
                        : (c.guaranteeMonthsPlural || "{count} months").replace("{count}", String(job.guarantee_period_months)))
                      : "—";
                    return (
                      <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{job.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{job.city || job.location || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{salaryRange}</td>
                        <td className="px-4 py-3 text-center">{job.candidates_count}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{fee}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{guarantee}</td>
                        <td className="px-4 py-3 text-center">{job.recruiters_count}</td>
                        <td className="px-4 py-3 text-center"><span className={`font-semibold ${statusColor}`}>{statusLabel}</span></td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateShort(job.created_at)}</td>
                      </tr>
                    );
                  })}
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
