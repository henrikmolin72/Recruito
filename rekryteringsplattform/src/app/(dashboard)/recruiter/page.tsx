import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Users, FileCheck, CalendarClock, UserCheck, Target } from "lucide-react";
import { getRecruiterDashboard, getAvailableJobsForRecruiter } from "@/lib/actions/recruiter";
import { getRecruiterPerformanceMetrics, getMyActiveGuaranteeTimers } from "@/lib/actions/placements";
import { PerformanceMetrics } from "@/components/dashboard/recruiter/performance-metrics";
import { getDictionary } from "@/i18n/server";
import { formatJobLocation } from "@/lib/format-job-location";
import { GuaranteeTimer } from "@/components/guarantee/guarantee-timer";

export default async function RecruiterDashboard() {
  const [dashboardData, metrics, availableJobs, activeGuarantees] = await Promise.all([
    getRecruiterDashboard(),
    getRecruiterPerformanceMetrics(),
    getAvailableJobsForRecruiter(),
    getMyActiveGuaranteeTimers(),
  ]);
  const { userName, mandates, stats } = dashboardData;
  const dict = await getDictionary();
  const r = dict.recruiter;

  // Client-requested funnel rates, both over Candidates Submitted (= total presented,
  // == metrics.candidatesSubmitted, same COUNT). Hire rate reuses the snapshot figure so
  // this box matches the existing "Conversion (hire rate)" number exactly.
  const submitted = metrics?.candidatesSubmitted ?? stats.candidates ?? 0;
  const candidatesHired = metrics?.candidatesHired ?? stats.hired ?? 0;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const interviewRate = submitted > 0 ? round2((stats.movedToInterview / submitted) * 100) : 0;
  const hireRate = metrics ? metrics.hireRate : submitted > 0 ? round2((stats.hired / submitted) * 100) : 0;

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          title={r.rateInterview}
          value={`${interviewRate}%`}
          icon={CalendarClock}
          description={r.rateInterviewSub.replace("{moved}", String(stats.movedToInterview)).replace("{submitted}", String(submitted))}
        />
        <StatsCard
          title={r.rateHire}
          value={`${hireRate}%`}
          icon={Target}
          description={r.rateHireSub.replace("{hired}", String(candidatesHired)).replace("{submitted}", String(submitted))}
        />
      </div>

      {metrics && <PerformanceMetrics metrics={metrics} openJobs={availableJobs.length} />}

      {activeGuarantees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{r.activeGuaranteesTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeGuarantees.map((g) => (
                <GuaranteeTimer
                  key={g.id}
                  guaranteeEndDate={g.guaranteeEndDate}
                  guaranteeStartDate={g.joiningDate}
                  candidateName={g.candidateName}
                  jobTitle={g.jobTitle}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                    <p className="text-sm text-muted-foreground">{mandate.company} — {formatJobLocation(mandate) || mandate.location}</p>
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
