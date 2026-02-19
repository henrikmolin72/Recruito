import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, Wallet, FileCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getRecruiterDashboard } from "@/lib/actions/recruiter";

export default async function RecruiterDashboard() {
  const { recruiter, userName, mandates, stats, recentActivity } = await getRecruiterDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Välkommen tillbaka, {userName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Aktiva mandat" value={stats.activeMandates || 0} icon={FileCheck} />
        <StatsCard title="Presenterade kandidater" value={stats.candidates || 0} icon={Users} />
        <StatsCard title="Tillgängliga jobb" value={stats.availableJobs || 0} icon={Briefcase} />
        <StatsCard title="Intäkter" value={formatCurrency(stats.revenue || 0)} icon={Wallet} description="Totalt intjänat" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mina aktiva mandat</CardTitle>
        </CardHeader>
        <CardContent>
          {mandates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Du har inga aktiva mandat just nu. Gå till &quot;Hitta uppdrag&quot; för att se tillgängliga jobb.
            </div>
          ) : (
            <div className="space-y-4">
              {mandates.map((mandate: any) => (
                <div key={mandate.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <h3 className="font-semibold">{mandate.title}</h3>
                    <p className="text-sm text-muted-foreground">{mandate.company} — {mandate.location}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="blue">{mandate.candidates} kandidater</Badge>
                    <StatusBadge status={mandate.status} />
                  </div>
                </div>
              ))}
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
                  <div className="h-2 w-2 rounded-full bg-success-500 mt-2 shrink-0" />
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
