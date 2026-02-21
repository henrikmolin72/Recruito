import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Clock, CheckCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getRecruiterEarnings } from "@/lib/actions/recruiter";
import { getDictionary } from "@/i18n/server";

export default async function RecruiterEarningsPage() {
  const { placements, stats } = await getRecruiterEarnings();
  const dict = await getDictionary();
  const r = dict.recruiter;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{r.earningsPageTitle}</h1>
        <p className="text-muted-foreground">{r.earningsPageSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title={r.totalRevenue} value={formatCurrency(stats.total)} icon={Wallet} />
        <StatsCard title={r.paidOut} value={formatCurrency(stats.paid)} icon={CheckCircle} />
        <StatsCard title={r.underGuaranteePeriod} value={formatCurrency(stats.guarantee)} icon={Clock} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{r.earningsHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {placements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {r.noEarningsYet}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">{r.tableJob}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{r.tableCompany}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{r.tableCandidate}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{r.tableAmount}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{r.tableStatus}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{r.tableDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {placements.map((p: any) => {
                    const candidate = Array.isArray(p.candidate) ? p.candidate[0] : p.candidate;
                    const job = Array.isArray(p.job) ? p.job[0] : p.job;
                    const company = Array.isArray(p.company) ? p.company[0] : p.company;
                    const isPaid = p.status === "payout_released" || p.status === "payment_received";
                    const isGuarantee = p.status === "guarantee_active";

                    return (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="py-3 font-medium">{job?.title || "—"}</td>
                        <td className="py-3">{company?.company_name || "—"}</td>
                        <td className="py-3">{candidate ? `${candidate.first_name} ${candidate.last_name}` : "—"}</td>
                        <td className="py-3 font-medium text-success-700">{formatCurrency(p.recruiter_fee)}</td>
                        <td className="py-3">
                          <Badge variant={isPaid ? "success" : isGuarantee ? "blue" : "warning"}>
                            {isPaid ? r.earningsPaid : isGuarantee ? r.earningsGuarantee : r.earningsPending}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">{formatDate(p.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
