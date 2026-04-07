import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Building2, Users, Briefcase, Banknote, TrendingUp, CheckCircle, User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getAdminStats, getPendingRecruiters, getAdminPlacements } from "@/lib/actions/admin";
import { RecruiterApprovalActions } from "@/components/dashboard/admin/recruiter-approval-actions";
import { getDictionary } from "@/i18n/server";

export default async function AdminDashboard() {
  const [stats, pendingRecruiters, placements] = await Promise.all([
    getAdminStats(),
    getPendingRecruiters(),
    getAdminPlacements(),
  ]);

  const recentPlacements = placements.slice(0, 5);
  const dict = await getDictionary();
  const a = dict.admin;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{a.dashboardTitle}</h1>
        <p className="text-muted-foreground">{a.platformOverview}</p>
      </div>

      {/* Platform Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title={a.companiesStat} value={stats.companies} icon={Building2} />
        <StatsCard title={a.recruitersStat} value={stats.approvedRecruiters} description={`${stats.recruiters} total`} icon={Users} />
        <StatsCard title={a.activeJobsStat} value={stats.activeJobs} icon={Briefcase} />
        <StatsCard title={a.platformRevenue} value={formatCurrency(stats.totalRevenue)} icon={Banknote} />
      </div>

      {/* Activity & Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Candidates" value={stats.totalCandidates} icon={User} />
        <StatsCard title="Total Placements" value={stats.totalPlacements} icon={CheckCircle} />
        <StatsCard title="Success Rate" value={`${stats.placementSuccessRate.toFixed(1)}%`} description={`${stats.completedPlacements} completed`} icon={TrendingUp} />
        <StatsCard title={a.pendingApprovals} value={stats.pendingRecruiters} icon={TrendingUp} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {a.pendingRecruiters}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRecruiters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{a.noPendingApprovals}</p>
            ) : (
              <div className="space-y-3">
                {pendingRecruiters.map((recruiter) => (
                  <div key={recruiter.id} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{recruiter.name}</p>
                      <p className="text-xs text-muted-foreground">{recruiter.email}</p>
                    </div>
                    <RecruiterApprovalActions recruiterId={recruiter.id} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {a.recentPlacements}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPlacements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{a.noPlacementsYet}</p>
            ) : (
              <div className="space-y-3">
                {recentPlacements.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.job}</p>
                      <p className="text-xs text-muted-foreground">{p.company} • {p.recruiter}</p>
                      <p className="text-xs text-muted-foreground">Candidate: {p.candidate}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-semibold text-emerald-600">{formatCurrency(p.totalFee)}</p>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Links */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">View detailed analytics by category:</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <a href="/admin/analytics/recruiters" className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-center">
              <p className="text-xs font-semibold text-muted-foreground">Recruiters</p>
              <p className="text-lg font-bold">{stats.approvedRecruiters}</p>
            </a>
            <a href="/admin/analytics/jobs" className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-center">
              <p className="text-xs font-semibold text-muted-foreground">Active Jobs</p>
              <p className="text-lg font-bold">{stats.activeJobs}</p>
            </a>
            <a href="/admin/analytics/candidates" className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-center">
              <p className="text-xs font-semibold text-muted-foreground">Candidates</p>
              <p className="text-lg font-bold">{stats.totalCandidates}</p>
            </a>
            <a href="/admin/analytics/companies" className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-center">
              <p className="text-xs font-semibold text-muted-foreground">Companies</p>
              <p className="text-lg font-bold">{stats.companies}</p>
            </a>
            <a href="/admin/analytics/earnings" className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-center">
              <p className="text-xs font-semibold text-muted-foreground">Revenue</p>
              <p className="text-lg font-bold">{formatCurrency(stats.totalRevenue)}</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
