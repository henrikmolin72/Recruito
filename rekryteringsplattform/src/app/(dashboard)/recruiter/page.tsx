import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Users, FileCheck, CalendarClock, UserCheck } from "lucide-react";
import { getRecruiterDashboard, getAvailableJobsForRecruiter } from "@/lib/actions/recruiter";
import { getRecruiterPerformanceMetrics } from "@/lib/actions/placements";
import { PerformanceMetrics } from "@/components/dashboard/recruiter/performance-metrics";
import { getDictionary } from "@/i18n/server";

export default async function RecruiterDashboard() {
  const [dashboardData, metrics, availableJobs] = await Promise.all([
    getRecruiterDashboard(),
    getRecruiterPerformanceMetrics(),
    getAvailableJobsForRecruiter(),
  ]);
  const { userName, mandates, stats } = dashboardData;
  const dict = await getDictionary();
  const r = dict.recruiter;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{r.dashboardTitle}</h1>
        <p className="text-muted-foreground">{r.welcomeBack.replace("{name}", userName)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title={r.activeMandates} value={stats.activeMandates || 0} icon={FileCheck} />
        <StatsCard title={r.presentedCandidates} value={stats.candidates || 0} icon={Users} />
        <StatsCard title={r.inInterview} value={stats.inInterview || 0} icon={CalendarClock} />
        <StatsCard title={r.hired} value={stats.hired || 0} icon={UserCheck} />
      </div>

      {metrics && <PerformanceMetrics metrics={metrics} openJobs={availableJobs.length} />}

      <Card>
        <CardHeader>
          <CardTitle>{r.myActiveMandates}</CardTitle>
        </CardHeader>
        <CardContent>
          {mandates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {r.noActiveMandates}
            </div>
          ) : (
            <div className="space-y-4">
              {mandates.map((mandate: any) => (
                <div key={mandate.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <h3 className="font-semibold">{mandate.title}</h3>
                    <p className="text-sm text-muted-foreground">{mandate.company} — {mandate.location}</p>
                  </div>
                  <StatusBadge status={mandate.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
