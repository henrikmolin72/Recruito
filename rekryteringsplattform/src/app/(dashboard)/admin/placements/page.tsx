import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

const MOCK_PLACEMENTS = [
  { id: 1, job: "Backend-utvecklare Python", company: "TechCorp AB", recruiter: "Karl Pettersson", candidate: "Lisa Andersson", totalFee: 103500, platformFee: 25875, recruiterFee: 77625, status: "completed", date: "2025-01-15" },
  { id: 2, job: "Senior Frontend-utvecklare", company: "TechCorp AB", recruiter: "Erik Lindgren", candidate: "Johan Berg", totalFee: 108000, platformFee: 27000, recruiterFee: 81000, status: "guarantee", date: "2025-02-05" },
  { id: 3, job: "Ekonomichef", company: "FinanceHQ", recruiter: "Anna Svensson", candidate: "Maria Ek", totalFee: 126000, platformFee: 31500, recruiterFee: 94500, status: "pending", date: "2025-02-10" },
];

export default function AdminPlacementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Placeringar</h1>
        <p className="text-muted-foreground">Hantera placeringar och utbetalningar</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-medium text-muted-foreground">Jobb</th>
                <th className="p-4 font-medium text-muted-foreground">Företag</th>
                <th className="p-4 font-medium text-muted-foreground">Rekryterare</th>
                <th className="p-4 font-medium text-muted-foreground">Kandidat</th>
                <th className="p-4 font-medium text-muted-foreground">Total avgift</th>
                <th className="p-4 font-medium text-muted-foreground">Plattform (25%)</th>
                <th className="p-4 font-medium text-muted-foreground">Rekryterare (75%)</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PLACEMENTS.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-medium">{p.job}</td>
                  <td className="p-4">{p.company}</td>
                  <td className="p-4">{p.recruiter}</td>
                  <td className="p-4">{p.candidate}</td>
                  <td className="p-4 font-medium">{formatCurrency(p.totalFee)}</td>
                  <td className="p-4 text-brand-600">{formatCurrency(p.platformFee)}</td>
                  <td className="p-4 text-success-700">{formatCurrency(p.recruiterFee)}</td>
                  <td className="p-4">
                    <Badge variant={p.status === "completed" ? "success" : p.status === "guarantee" ? "blue" : "warning"}>
                      {p.status === "completed" ? "Slutförd" : p.status === "guarantee" ? "Garanti" : "Väntande"}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Button size="sm" variant="outline" className="h-7 text-xs">Hantera</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
