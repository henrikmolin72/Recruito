import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { CreditCard, FileText, Clock, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const MOCK_INVOICES = [
  { id: "INV-001", job: "Backend-utvecklare Python", candidate: "Lisa Andersson", amount: 103500, status: "paid", date: "2025-01-15" },
  { id: "INV-002", job: "Senior Frontend-utvecklare", candidate: "Johan Berg", amount: 108000, status: "pending", date: "2025-02-01" },
];

export default function CompanyBillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fakturering</h1>
        <p className="text-muted-foreground">Översikt av fakturor och betalningar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Totalt fakturerat" value={formatCurrency(211500)} icon={CreditCard} />
        <StatsCard title="Väntande betalning" value={formatCurrency(108000)} icon={Clock} />
        <StatsCard title="Antal placeringar" value={2} icon={CheckCircle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fakturor</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-medium text-muted-foreground">Faktura</th>
                <th className="pb-3 font-medium text-muted-foreground">Jobb</th>
                <th className="pb-3 font-medium text-muted-foreground">Kandidat</th>
                <th className="pb-3 font-medium text-muted-foreground">Belopp</th>
                <th className="pb-3 font-medium text-muted-foreground">Status</th>
                <th className="pb-3 font-medium text-muted-foreground">Datum</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_INVOICES.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-0">
                  <td className="py-3 font-medium">{inv.id}</td>
                  <td className="py-3">{inv.job}</td>
                  <td className="py-3">{inv.candidate}</td>
                  <td className="py-3 font-medium">{formatCurrency(inv.amount)}</td>
                  <td className="py-3">
                    <Badge variant={inv.status === "paid" ? "success" : "warning"}>
                      {inv.status === "paid" ? "Betald" : "Väntande"}
                    </Badge>
                  </td>
                  <td className="py-3 text-muted-foreground">{inv.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
