import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, Wallet, FileCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const MOCK_MANDATES = [
  { id: 1, title: "Senior Frontend-utvecklare", company: "TechCorp AB", location: "Stockholm", candidates: 2, status: "active" },
  { id: 2, title: "DevOps Engineer", company: "TechCorp AB", location: "Remote", candidates: 1, status: "active" },
  { id: 3, title: "Data Analyst", company: "FinanceHQ", location: "Göteborg", candidates: 0, status: "active" },
];

export default function RecruiterDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Välkommen tillbaka, Erik Lindgren</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Aktiva mandat" value="3/5" icon={FileCheck} />
        <StatsCard title="Presenterade kandidater" value={8} icon={Users} trend={{ value: 15, positive: true }} />
        <StatsCard title="Tillgängliga jobb" value={24} icon={Briefcase} />
        <StatsCard title="Intäkter (2025)" value={formatCurrency(67500)} icon={Wallet} trend={{ value: 22, positive: true }} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mina aktiva mandat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MOCK_MANDATES.map((mandate) => (
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Senaste aktiviteten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { text: "Johan Berg gick vidare till intervju hos TechCorp AB", time: "1 dag sedan" },
              { text: "Du tog mandatet för Data Analyst hos FinanceHQ", time: "2 dagar sedan" },
              { text: "Sara Nilsson granskas av TechCorp AB", time: "3 dagar sedan" },
              { text: "Utbetalning mottagen: 67 500 SEK", time: "1 vecka sedan" },
            ].map((activity, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                <div className="h-2 w-2 rounded-full bg-success-500 mt-2 shrink-0" />
                <div>
                  <p className="text-sm">{activity.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
