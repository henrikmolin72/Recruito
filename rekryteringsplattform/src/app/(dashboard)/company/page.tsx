import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Briefcase, Users, Clock, CheckCircle } from "lucide-react";
import { getCompanyDashboard } from "@/lib/actions/company";
import { formatDate } from "@/lib/utils";

export default async function CompanyDashboard() {
  const { company, jobs, stats, recentActivity } = await getCompanyDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Välkommen tillbaka, {company.company_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Aktiva jobb" value={stats.activeJobs} icon={Briefcase} />
        <StatsCard title="Presenterade kandidater" value={stats.candidates} icon={Users} />
        <StatsCard title="Pågående intervjuer" value={stats.interviews} icon={Clock} />
        <StatsCard title="Lyckade placeringar" value={stats.placements} icon={CheckCircle} description="Totalt antal" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dina jobb</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Du har inga jobb än. Skapa ditt första jobb för att komma igång!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Titel</th>
                    <th className="pb-3 font-medium text-muted-foreground">Plats</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground">Genomförd</th>
                    <th className="pb-3 font-medium text-muted-foreground">Rekryterare</th>
                    <th className="pb-3 font-medium text-muted-foreground">Kandidater</th>
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
          <CardTitle>Senaste aktiviteten</CardTitle>
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
              <p className="text-sm text-muted-foreground">Ingen aktivitet att visa än.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
