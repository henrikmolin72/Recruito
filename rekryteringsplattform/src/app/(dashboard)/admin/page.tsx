import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Building2, Users, Briefcase, Banknote, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getAdminStats, getPendingRecruiters, getAdminPlacements } from "@/lib/actions/admin";
import { RecruiterApprovalActions } from "@/components/dashboard/admin/recruiter-approval-actions";

export default async function AdminDashboard() {
  const [stats, pendingRecruiters, placements] = await Promise.all([
    getAdminStats(),
    getPendingRecruiters(),
    getAdminPlacements(),
  ]);

  const recentPlacements = placements.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Plattformsöversikt</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard title="Företag" value={stats.companies} icon={Building2} />
        <StatsCard title="Rekryterare" value={stats.recruiters} icon={Users} />
        <StatsCard title="Aktiva jobb" value={stats.activeJobs} icon={Briefcase} />
        <StatsCard title="Plattformens intäkter" value={formatCurrency(stats.totalRevenue)} icon={Banknote} />
        <StatsCard title="Väntande godkännanden" value={stats.pendingRecruiters} icon={TrendingUp} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Väntande rekryterare</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRecruiters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Inga väntande godkännanden</p>
            ) : (
              <div className="space-y-3">
                {pendingRecruiters.map((recruiter) => (
                  <div key={recruiter.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{recruiter.name}</p>
                      <p className="text-xs text-muted-foreground">{recruiter.email} — {recruiter.headline || "Rekryterare"}</p>
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
            <CardTitle>Senaste placeringar</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPlacements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Inga placeringar ännu</p>
            ) : (
              <div className="space-y-3">
                {recentPlacements.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{p.job}</p>
                      <p className="text-xs text-muted-foreground">{p.company} — {p.recruiter}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(p.totalFee)}</p>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
