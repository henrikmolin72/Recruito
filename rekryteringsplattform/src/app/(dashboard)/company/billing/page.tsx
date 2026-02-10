import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function CompanyBillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!company) redirect("/login");

  const { data: placements } = await supabase
    .from("placements")
    .select("*, jobs(title)")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const totalCost = placements?.reduce((sum, p) => sum + p.total_fee, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fakturering</h1>
        <p className="text-muted-foreground">
          Översikt av placeringar och betalningar
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Total kostnad</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{formatCurrency(totalCost)}</p>
        </CardContent>
      </Card>

      {placements && placements.length > 0 ? (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jobb</TableHead>
                <TableHead>Belopp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Datum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placements.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {(p.jobs as any)?.title}
                  </TableCell>
                  <TableCell>{formatCurrency(p.total_fee)}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(p.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={<CreditCard className="size-10" />}
          title="Inga placeringar ännu"
          description="Fakturor och betalningar visas här när kandidater anställs."
        />
      )}
    </div>
  );
}
