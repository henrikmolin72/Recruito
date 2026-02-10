import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function RecruiterEarningsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recruiter } = await supabase
    .from("recruiters").select("id, stripe_onboarding_complete").eq("user_id", user.id).single();
  if (!recruiter) redirect("/login");

  const { data: placements } = await supabase
    .from("placements")
    .select("*, jobs(title), companies(company_name)")
    .eq("recruiter_id", recruiter.id)
    .order("created_at", { ascending: false });

  const totalEarned = placements
    ?.filter((p) => p.status === "payout_released")
    .reduce((s, p) => s + p.recruiter_fee, 0) ?? 0;
  const pending = placements
    ?.filter((p) => ["confirmed", "invoice_sent", "payment_received", "guarantee_active"].includes(p.status))
    .reduce((s, p) => s + p.recruiter_fee, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Intäkter</h1>
        <p className="text-muted-foreground">Översikt av dina intäkter och utbetalningar</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total intjänad</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success-700">{formatCurrency(totalEarned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Väntande utbetalning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(pending)}</p>
          </CardContent>
        </Card>
      </div>

      {!recruiter.stripe_onboarding_complete && (
        <Card className="border-warning-500 bg-warning-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold">Anslut ditt bankkonto</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Slutför Stripe Connect-onboarding för att kunna ta emot utbetalningar.
            </p>
          </CardContent>
        </Card>
      )}

      {placements && placements.length > 0 ? (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jobb</TableHead>
                <TableHead>Företag</TableHead>
                <TableHead>Din andel</TableHead>
                <TableHead>Garanti t.o.m.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placements.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{(p.jobs as any)?.title}</TableCell>
                  <TableCell>{(p.companies as any)?.company_name}</TableCell>
                  <TableCell>{formatCurrency(p.recruiter_fee)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(p.guarantee_end_date)}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={<DollarSign className="size-10" />}
          title="Inga intäkter ännu"
          description="Intäkter visas här när dina kandidater anställs." />
      )}
    </div>
  );
}
