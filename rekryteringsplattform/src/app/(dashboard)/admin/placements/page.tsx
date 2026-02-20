import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getAdminPlacements } from "@/lib/actions/admin";

export default async function AdminPlacementsPage() {
  const placements = await getAdminPlacements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Placeringar</h1>
        <p className="text-muted-foreground">Hantera placeringar och utbetalningar ({placements.length} totalt)</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-medium text-muted-foreground">Jobb</th>
                <th className="p-4 font-medium text-muted-foreground">Företag</th>
                <th className="p-4 font-medium text-muted-foreground">Rekryterare</th>
                <th className="p-4 font-medium text-muted-foreground">Kandidat</th>
                <th className="p-4 font-medium text-muted-foreground">Total avgift</th>
                <th className="p-4 font-medium text-muted-foreground">Plattform</th>
                <th className="p-4 font-medium text-muted-foreground">Rekryterare</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Datum</th>
              </tr>
            </thead>
            <tbody>
              {placements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">Inga placeringar ännu</td>
                </tr>
              ) : (
                placements.map((placement) => (
                  <tr key={placement.id} className="border-b border-border last:border-0">
                    <td className="p-4 font-medium">{placement.job}</td>
                    <td className="p-4">{placement.company}</td>
                    <td className="p-4">{placement.recruiter}</td>
                    <td className="p-4">{placement.candidate}</td>
                    <td className="p-4 font-medium">{formatCurrency(placement.totalFee)}</td>
                    <td className="p-4 text-brand-600">{formatCurrency(placement.platformFee)}</td>
                    <td className="p-4 text-success-700">{formatCurrency(placement.recruiterFee)}</td>
                    <td className="p-4"><StatusBadge status={placement.status} /></td>
                    <td className="p-4 text-muted-foreground">{formatDate(placement.date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
