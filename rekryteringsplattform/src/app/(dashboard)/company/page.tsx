import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Briefcase, Users, Clock, CheckCircle } from "lucide-react";
import { getCompanyDashboard } from "@/lib/actions/company";
import { formatDate } from "@/lib/utils";
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
        <StatsCard title={c.activeJobs} value={stats.activeJobs} icon={Briefcase} />
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
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableTitle}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableLocation}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableStatus}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableCompleted}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableRecruiters}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableCandidates}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableRecruitmentFee}</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job: any) => (
                    <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 font-medium">{job.title}</td>
                      <td className="py-3 text-muted-foreground">{job.location}</td>
                      <td className="py-3"><StatusBadge status={job.status} /></td>
                      <td className="py-3 text-muted-foreground">{formatDate(job.created_at)}</td>
                      <td className="py-3"><Badge variant="outline">{job.recruiters_count}</Badge></td>
                      <td className="py-3">{job.candidates_count}</td>
                      <td className="py-3">{job.fee_percentage}%</td>
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
