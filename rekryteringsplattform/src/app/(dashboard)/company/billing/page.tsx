import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Clock, CheckCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/server";
import { GuaranteeBillingRow } from "@/components/guarantee/guarantee-billing-row";

async function getCompanyBilling() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { placements: [], stats: { total: 0, pending: 0, count: 0 } };

  const { data: company } = await supabase.from("companies").select("id").eq("user_id", user.id).single();
  if (!company) return { placements: [], stats: { total: 0, pending: 0, count: 0 } };

  const { data: placements, error } = await supabase
    .from("placements")
    .select(`
      *,
      candidate:candidates (first_name, last_name),
      job:jobs (title)
    `)
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching billing:", error);
    return { placements: [], stats: { total: 0, pending: 0, count: 0 } };
  }

  const data = placements || [];
  const total = data.reduce((sum, p) => sum + (p.total_fee || 0), 0);
  const pending = data.filter(p => p.status !== "payment_received" && p.status !== "payout_released").reduce((sum, p) => sum + (p.total_fee || 0), 0);

  return { placements: data, stats: { total, pending, count: data.length } };
}

export default async function CompanyBillingPage() {
  const { placements, stats } = await getCompanyBilling();
  const dict = await getDictionary();
  const c = dict.company;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{c.billingPageTitle}</h1>
        <p className="text-muted-foreground">{c.billingPageSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title={c.totalInvoiced} value={formatCurrency(stats.total)} icon={CreditCard} />
        <StatsCard title={c.pendingPayment} value={formatCurrency(stats.pending)} icon={Clock} />
        <StatsCard title={c.placementCount} value={stats.count} icon={CheckCircle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{c.invoicesTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {placements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {c.noInvoicesYet}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableJob}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableCandidate}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{c.tableAmount}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{dict.common.status}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{dict.common.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {placements.map((p: any) => {
                    const candidate = Array.isArray(p.candidate) ? p.candidate[0] : p.candidate;
                    const job = Array.isArray(p.job) ? p.job[0] : p.job;
                    const isPaid = p.status === "payment_received" || p.status === "payout_released";

                    return (
                      <>
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <td className="py-3 font-medium">{job?.title || "—"}</td>
                          <td className="py-3">{candidate ? `${candidate.first_name} ${candidate.last_name}` : "—"}</td>
                          <td className="py-3 font-medium">{formatCurrency(p.total_fee)}</td>
                          <td className="py-3">
                            <Badge variant={isPaid ? "success" : "warning"}>
                              {isPaid ? c.paid : c.pendingStatus}
                            </Badge>
                          </td>
                          <td className="py-3 text-muted-foreground">{formatDate(p.created_at)}</td>
                        </tr>
                        {p.guarantee_end_date && (
                          <tr key={`${p.id}-guarantee`}>
                            <td colSpan={5} className="py-2 px-1">
                              <GuaranteeBillingRow
                                placementId={p.id}
                                candidateName={candidate ? `${candidate.first_name} ${candidate.last_name}` : ""}
                                jobTitle={job?.title ?? ""}
                                guaranteeEndDate={p.guarantee_end_date}
                                status={p.status}
                                currency={p.salary_currency ?? "SEK"}
                              />
                            </td>
                          </tr>
                        )}
                      </>
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
