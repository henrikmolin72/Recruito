import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Briefcase, Users, Clock, CheckCircle } from "lucide-react";
import { getCompanyDashboard } from "@/lib/actions/company";
import { getDictionary } from "@/i18n/server";

export default async function CompanyDashboard() {
  const { company, stats, recentActivity } = await getCompanyDashboard();
  const dict = await getDictionary();
  const c = dict.company;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{c.dashboardTitle}</h1>
        <p className="text-muted-foreground">{c.welcomeBack.replace("{name}", company.company_name)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title={c.activeJobs} value={stats.activeJobs} icon={Briefcase} description={`Draft ${stats.draftJobs} / ${c.statusPaused || "Paused"} ${stats.closedJobs}`} />
        <StatsCard title={c.presentedCandidates} value={stats.candidates} icon={Users} />
        <StatsCard title={c.ongoingInterviews} value={stats.interviews} icon={Clock} />
        <StatsCard title={c.successfulPlacements} value={stats.placements} icon={CheckCircle} description={c.totalCount} />
      </div>

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
