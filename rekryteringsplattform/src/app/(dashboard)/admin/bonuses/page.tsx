import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Gift, CheckCircle, Banknote } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { approveBonus, markBonusPaid } from "@/lib/payments/interview-bonus";

async function approveBonusAction(bonusId: string) {
  "use server";
  await approveBonus(bonusId);
  revalidatePath("/admin/bonuses");
}

async function markBonusPaidAction(formData: FormData) {
  "use server";
  const bonusId = formData.get("bonusId") as string;
  const bankReference = formData.get("bankReference") as string;
  if (!bonusId || !bankReference) return;
  await markBonusPaid(bonusId, bankReference);
  revalidatePath("/admin/bonuses");
}

function getBonusTypeLabel(type: string): string {
  switch (type) {
    case "first_interview":
      return "Forsta intervju";
    case "final_interview":
      return "Slutintervju";
    default:
      return type;
  }
}

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminBonusesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const statusFilter = params.status || "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/login");

  // Build query for bonuses
  let query = supabase
    .from("interview_bonuses")
    .select(
      "*, candidates(first_name, last_name), jobs(title), recruiters(user_id)"
    )
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: bonuses } = await query;
  const allBonuses = bonuses ?? [];

  // Fetch recruiter profiles for display names
  const recruiterUserIds = [
    ...new Set(
      allBonuses
        .map((b) => (b as any).recruiters?.user_id)
        .filter(Boolean)
    ),
  ];

  let recruiterProfiles: Record<string, string> = {};
  if (recruiterUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", recruiterUserIds);
    if (profiles) {
      recruiterProfiles = Object.fromEntries(
        profiles.map((p) => [p.id, p.full_name])
      );
    }
  }

  // Summary counts
  const pendingBonuses = allBonuses.filter((b) => b.status === "pending");
  const approvedBonuses = allBonuses.filter((b) => b.status === "approved");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidThisMonth = allBonuses.filter(
    (b) => b.status === "paid" && b.paid_at && new Date(b.paid_at) >= startOfMonth
  );

  const totalPendingAmount = pendingBonuses.reduce(
    (sum, b) => sum + b.amount_eur,
    0
  );
  const totalApprovedAmount = approvedBonuses.reduce(
    (sum, b) => sum + b.amount_eur,
    0
  );
  const totalPaidThisMonthAmount = paidThisMonth.reduce(
    (sum, b) => sum + b.amount_eur,
    0
  );

  // Filter statuses for navigation
  const statuses = [
    { value: "all", label: "Alla" },
    { value: "pending", label: "Vantande" },
    { value: "approved", label: "Godkanda" },
    { value: "paid", label: "Betalda" },
    { value: "cancelled", label: "Avbrutna" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Intervjubonusar</h1>
        <p className="text-muted-foreground">
          Hantera intervjubonusar for rekryterare
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vantande godkannande
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingBonuses.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalPendingAmount} EUR totalt
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Godkanda (ej betalda)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {approvedBonuses.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalApprovedAmount} EUR totalt
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Betalda denna manad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {paidThisMonth.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalPaidThisMonthAmount} EUR totalt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        {statuses.map((s) => (
          <Link key={s.value} href={`/admin/bonuses?status=${s.value}`}>
            <Button
              variant={statusFilter === s.value ? "default" : "outline"}
              size="sm"
            >
              {s.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Bonuses Table */}
      {allBonuses.length > 0 ? (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kandidat</TableHead>
                <TableHead>Jobb</TableHead>
                <TableHead>Rekryterare</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Belopp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Skapad</TableHead>
                <TableHead className="text-right">Atgarder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allBonuses.map((bonus) => {
                const recruiterUserId = (bonus as any).recruiters?.user_id;
                const recruiterName = recruiterUserId
                  ? recruiterProfiles[recruiterUserId] || "-"
                  : "-";

                return (
                  <TableRow key={bonus.id}>
                    <TableCell className="font-medium">
                      {(bonus as any).candidates?.first_name}{" "}
                      {(bonus as any).candidates?.last_name}
                    </TableCell>
                    <TableCell>
                      {(bonus as any).jobs?.title || "-"}
                    </TableCell>
                    <TableCell>{recruiterName}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">
                        {getBonusTypeLabel(bonus.bonus_type)}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {bonus.amount_eur} EUR
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={bonus.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(bonus.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {bonus.status === "pending" && (
                          <form
                            action={approveBonusAction.bind(null, bonus.id)}
                          >
                            <Button
                              type="submit"
                              size="sm"
                              className="gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="size-3" />
                              Godkann
                            </Button>
                          </form>
                        )}
                        {bonus.status === "approved" && (
                          <form action={markBonusPaidAction} className="flex items-center gap-1">
                            <input type="hidden" name="bonusId" value={bonus.id} />
                            <Input
                              name="bankReference"
                              placeholder="Bankreferens"
                              required
                              className="h-8 w-32 text-xs"
                            />
                            <Button
                              type="submit"
                              size="sm"
                              className="gap-1 bg-blue-600 hover:bg-blue-700"
                            >
                              <Banknote className="size-3" />
                              Markera betald
                            </Button>
                          </form>
                        )}
                        {bonus.status === "paid" && bonus.bank_reference && (
                          <span className="text-xs text-muted-foreground">
                            Ref: {bonus.bank_reference}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={<Gift className="size-10" />}
          title="Inga bonusar hittades"
          description={
            statusFilter !== "all"
              ? `Det finns inga bonusar med status "${statuses.find((s) => s.value === statusFilter)?.label}".`
              : "Det finns inga intervjubonusar annu."
          }
        />
      )}
    </div>
  );
}
