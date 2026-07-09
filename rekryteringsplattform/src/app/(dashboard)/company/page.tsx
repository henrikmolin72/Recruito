import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Briefcase, Users, UserCheck, Clock, CheckCircle } from "lucide-react";
import { getCompanyDashboard } from "@/lib/actions/company";
import { getDictionary } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { GuaranteeTimer } from "@/components/guarantee/guarantee-timer";

// Live guarantee countdowns for the dashboard — own placements via RLS, only
// rows with a confirmed joining date and a still-running guarantee window.
async function getActiveGuaranteeTimers() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("placements")
    .select(`
      id, joining_date, guarantee_end_date, status,
      candidate:candidates!placements_candidate_id_fkey(first_name, last_name),
      job:jobs(title)
    `)
    .not("joining_date", "is", null)
    .gte("guarantee_end_date", today)
    .in("status", ["confirmed", "invoice_sent", "payment_received", "guarantee_active"])
    .order("guarantee_end_date", { ascending: true });

  return (data ?? []).map((p: any) => {
    const candidate = Array.isArray(p.candidate) ? p.candidate[0] : p.candidate;
    const job = Array.isArray(p.job) ? p.job[0] : p.job;
    return {
      id: p.id,
      joiningDate: p.joining_date as string,
      guaranteeEndDate: p.guarantee_end_date as string,
      candidateName: candidate ? `${candidate.first_name} ${candidate.last_name}` : "—",
      jobTitle: job?.title ?? "—",
    };
  });
}

export default async function CompanyDashboard() {
  const [{ company, stats, recentActivity }, activeGuarantees] = await Promise.all([
    getCompanyDashboard(),
    getActiveGuaranteeTimers(),
  ]);
  const dict = await getDictionary();
  const c = dict.company;

  // Same raw-stage → label map as the candidate detail timeline.
  const stageNames: Record<string, string> = {
    viewed: c.stageNameViewed,
    interview: c.stageNameInterview,
    final_interview: c.stageNameFinalInterview,
    job_offer: c.stageNameJobOffer,
    hired: c.stageNameHired,
    rejected: c.stageNameRejected,
    withdrawn: c.stageNameWithdrawn,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{c.dashboardTitle}</h1>
        <p className="text-muted-foreground">{c.welcomeBack.replace("{name}", company.company_name)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatsCard title={c.activeJobs} value={stats.activeJobs} icon={Briefcase} description={`Draft ${stats.draftJobs} / ${c.statusPaused || "Paused"} ${stats.closedJobs}`} />
        <StatsCard title={c.presentedCandidates} value={stats.candidates} icon={Users} />
        <StatsCard title={c.tableCandidates} value={stats.activeCandidates} icon={UserCheck} />
        <StatsCard title={c.ongoingInterviews} value={stats.interviews} icon={Clock} />
        <StatsCard title={c.successfulPlacements} value={stats.placements} icon={CheckCircle} description={c.totalCount} />
      </div>

      {activeGuarantees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{c.activeGuaranteesTitle}</CardTitle>
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
          <CardTitle>{c.recentActivity}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="h-2 w-2 rounded-full bg-brand-500 mt-2 shrink-0" />
                  <div>
                    <p className="text-sm">
                      {c.activityStageChange
                        .replace("{name}", activity.candidateName)
                        .replace("{stage}", stageNames[activity.toStage] ?? activity.toStage.replace(/_/g, " "))}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(activity.createdAt).toLocaleString()}</p>
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
