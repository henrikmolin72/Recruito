import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Briefcase, Banknote, UserCheck, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Plattformsöversikt</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard title="Företag" value={47} icon={Building2} trend={{ value: 8, positive: true }} />
        <StatsCard title="Rekryterare" value={124} icon={Users} trend={{ value: 15, positive: true }} />
        <StatsCard title="Aktiva jobb" value={89} icon={Briefcase} trend={{ value: 12, positive: true }} />
        <StatsCard title="Lyckade placeringar" value={34} icon={UserCheck} description="Senaste 90 dagarna" />
        <StatsCard title="Plattformens intäkter" value={formatCurrency(425000)} icon={Banknote} trend={{ value: 22, positive: true }} />
        <StatsCard title="Väntande godkännanden" value={4} icon={TrendingUp} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Väntande rekryterare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Sofia Larsson", email: "sofia@email.se", industry: "Finans & Bank", applied: "2025-02-10" },
                { name: "Andreas Björk", email: "andreas@email.se", industry: "IT & Tech", applied: "2025-02-09" },
                { name: "Maria Ek", email: "maria@email.se", industry: "Sälj & Marknad", applied: "2025-02-08" },
                { name: "Johan Ström", email: "johan@email.se", industry: "Life Science", applied: "2025-02-07" },
              ].map((recruiter, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{recruiter.name}</p>
                    <p className="text-xs text-muted-foreground">{recruiter.email} — {recruiter.industry}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-xs px-3 py-1 rounded bg-success-500 text-white hover:bg-success-700">Godkänn</button>
                    <button className="text-xs px-3 py-1 rounded bg-danger-500 text-white hover:bg-danger-700">Neka</button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Senaste placeringar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { job: "Backend-utvecklare Python", company: "TechCorp AB", recruiter: "Karl Pettersson", amount: 103500, status: "guarantee" },
                { job: "Senior Frontend-utvecklare", company: "TechCorp AB", recruiter: "Erik Lindgren", amount: 108000, status: "pending" },
                { job: "Ekonomichef", company: "AccountFirm", recruiter: "Anna Svensson", amount: 126000, status: "completed" },
              ].map((placement, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{placement.job}</p>
                    <p className="text-xs text-muted-foreground">{placement.company} — {placement.recruiter}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(placement.amount)}</p>
                    <Badge variant={placement.status === "completed" ? "success" : placement.status === "guarantee" ? "blue" : "warning"}>
                      {placement.status === "completed" ? "Slutförd" : placement.status === "guarantee" ? "Garanti" : "Väntande"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
