import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const MOCK_EARNINGS = [
  { id: 1, job: "Backend-utvecklare Python", company: "TechCorp AB", candidate: "Lisa Andersson", amount: 77625, status: "paid", date: "2025-01-20" },
  { id: 2, job: "Senior Frontend-utvecklare", company: "TechCorp AB", candidate: "Johan Berg", amount: 81000, status: "guarantee", date: "2025-02-05" },
];

export default function RecruiterEarningsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Intäkter</h1>
        <p className="text-muted-foreground">Översikt av dina intäkter</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Totala intäkter" value={formatCurrency(158625)} icon={Wallet} />
        <StatsCard title="Utbetalt" value={formatCurrency(77625)} icon={CheckCircle} />
        <StatsCard title="Under garantiperiod" value={formatCurrency(81000)} icon={Clock} />
        <StatsCard title="Denna månad" value={formatCurrency(81000)} icon={TrendingUp} trend={{ value: 22, positive: true }} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Intäktshistorik</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-medium text-muted-foreground">Jobb</th>
                <th className="pb-3 font-medium text-muted-foreground">Företag</th>
                <th className="pb-3 font-medium text-muted-foreground">Kandidat</th>
                <th className="pb-3 font-medium text-muted-foreground">Belopp</th>
                <th className="pb-3 font-medium text-muted-foreground">Status</th>
                <th className="pb-3 font-medium text-muted-foreground">Datum</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_EARNINGS.map((earning) => (
                <tr key={earning.id} className="border-b border-border last:border-0">
                  <td className="py-3 font-medium">{earning.job}</td>
                  <td className="py-3">{earning.company}</td>
                  <td className="py-3">{earning.candidate}</td>
                  <td className="py-3 font-medium text-success-700">{formatCurrency(earning.amount)}</td>
                  <td className="py-3">
                    <Badge variant={earning.status === "paid" ? "success" : "blue"}>
                      {earning.status === "paid" ? "Utbetald" : "Garantiperiod"}
                    </Badge>
                  </td>
                  <td className="py-3 text-muted-foreground">{earning.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
