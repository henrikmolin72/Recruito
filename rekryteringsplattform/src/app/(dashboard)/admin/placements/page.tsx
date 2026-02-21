import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getAdminPlacements } from "@/lib/actions/admin";
import { getDictionary } from "@/i18n/server";

export default async function AdminPlacementsPage() {
  const placements = await getAdminPlacements();
  const dict = await getDictionary();
  const a = dict.admin;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{a.placementsPageTitle}</h1>
        <p className="text-muted-foreground">{a.placementsPageSubtitle.replace("{count}", String(placements.length))}</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-medium text-muted-foreground">{a.tablePlacementJob}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tablePlacementCompany}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tablePlacementRecruiter}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tablePlacementCandidate}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableTotalFee}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tablePlatformFee}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableRecruiterFee}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tablePlacementStatus}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tablePlacementDate}</th>
              </tr>
            </thead>
            <tbody>
              {placements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">{a.noPlacementsRegistered}</td>
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
