import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Unlock, AlertTriangle } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

async function releasePayout(placementId: string) {
  "use server";

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

  const { error } = await supabase
    .from("placements")
    .update({
      status: "payout_released",
      payout_released_at: new Date().toISOString(),
    })
    .eq("id", placementId);

  if (error) {
    throw new Error(`Kunde inte frigöra utbetalning: ${error.message}`);
  }

  await supabase.from("activity_log").insert({
    action_type: "payout_released",
    description: "Utbetalning frigjord för placering",
    entity_type: "placement",
    entity_id: placementId,
  });

  revalidatePath("/admin/placements");
}

function getGuaranteeDaysRemaining(
  guaranteeEndDate: string | null
): number | null {
  if (!guaranteeEndDate) return null;
  const end = new Date(guaranteeEndDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isGuaranteeExpired(guaranteeEndDate: string | null): boolean {
  if (!guaranteeEndDate) return false;
  return new Date(guaranteeEndDate) < new Date();
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminPlacementsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const activeTab = params.tab || "all";

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

  // Fetch all placements with related data
  const { data: placements } = await supabase
    .from("placements")
    .select(
      "*, jobs(title, companies(company_name)), recruiters(full_name), candidates(first_name, last_name)"
    )
    .order("created_at", { ascending: false });

  // Categorize placements
  const allPlacements = placements ?? [];

  const guaranteeActive = allPlacements.filter(
    (p) =>
      p.status === "guarantee_active" &&
      p.guarantee_end_date &&
      !isGuaranteeExpired(p.guarantee_end_date)
  );

  const readyForPayout = allPlacements.filter(
    (p) =>
      (p.status === "guarantee_active" || p.status === "payment_received") &&
      p.guarantee_end_date &&
      isGuaranteeExpired(p.guarantee_end_date)
  );

  const completed = allPlacements.filter(
    (p) => p.status === "payout_released" || p.status === "completed"
  );

  const problems = allPlacements.filter(
    (p) => p.status === "guarantee_failed" || p.status === "refund_processing"
  );

  function getFilteredPlacements() {
    switch (activeTab) {
      case "guarantee":
        return guaranteeActive;
      case "ready":
        return readyForPayout;
      case "completed":
        return completed;
      case "problems":
        return problems;
      default:
        return allPlacements;
    }
  }

  const filteredPlacements = getFilteredPlacements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Placeringar &amp; Utbetalningar</h1>
        <p className="text-muted-foreground">
          Hantera placeringar, garantiperioder och utbetalningar
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Under garantiperiod
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{guaranteeActive.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Redo för utbetalning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {readyForPayout.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Slutförda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completed.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">
              Problem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {problems.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="all" asChild>
            <a href="/admin/placements?tab=all">
              Alla ({allPlacements.length})
            </a>
          </TabsTrigger>
          <TabsTrigger value="guarantee" asChild>
            <a href="/admin/placements?tab=guarantee">
              Under garantiperiod ({guaranteeActive.length})
            </a>
          </TabsTrigger>
          <TabsTrigger value="ready" asChild>
            <a href="/admin/placements?tab=ready">
              Redo för utbetalning ({readyForPayout.length})
            </a>
          </TabsTrigger>
          <TabsTrigger value="completed" asChild>
            <a href="/admin/placements?tab=completed">
              Slutförda ({completed.length})
            </a>
          </TabsTrigger>
          <TabsTrigger value="problems" asChild>
            <a href="/admin/placements?tab=problems">
              Problem ({problems.length})
            </a>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredPlacements.length > 0 ? (
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kandidat</TableHead>
                    <TableHead>Jobb</TableHead>
                    <TableHead>Företag</TableHead>
                    <TableHead>Rekryterare</TableHead>
                    <TableHead>Lön</TableHead>
                    <TableHead>Totalt arvode</TableHead>
                    <TableHead>Plattformsandel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Garantiperiod</TableHead>
                    <TableHead className="text-right">Åtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlacements.map((placement) => {
                    const daysRemaining = getGuaranteeDaysRemaining(
                      placement.guarantee_end_date
                    );
                    const expired = isGuaranteeExpired(
                      placement.guarantee_end_date
                    );
                    const isReadyForPayout =
                      expired &&
                      (placement.status === "guarantee_active" ||
                        placement.status === "payment_received");

                    return (
                      <TableRow
                        key={placement.id}
                        className={isReadyForPayout ? "bg-green-50" : ""}
                      >
                        <TableCell className="font-medium">
                          {(placement as any).candidates?.first_name}{" "}
                          {(placement as any).candidates?.last_name}
                        </TableCell>
                        <TableCell>
                          {(placement as any).jobs?.title || "-"}
                        </TableCell>
                        <TableCell>
                          {(placement as any).jobs?.companies?.company_name ||
                            "-"}
                        </TableCell>
                        <TableCell>
                          {(placement as any).recruiters?.full_name || "-"}
                        </TableCell>
                        <TableCell>
                          {placement.annual_salary
                            ? formatCurrency(placement.annual_salary)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {placement.total_fee
                            ? formatCurrency(placement.total_fee)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {placement.platform_fee
                            ? formatCurrency(placement.platform_fee)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={placement.status} />
                        </TableCell>
                        <TableCell>
                          {placement.guarantee_end_date ? (
                            expired ? (
                              <span className="text-sm font-medium text-green-600">
                                Avslutad
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-cyan-600">
                                {daysRemaining} dagar kvar
                              </span>
                            )
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isReadyForPayout && (
                            <form
                              action={releasePayout.bind(
                                null,
                                placement.id
                              )}
                            >
                              <Button
                                type="submit"
                                size="sm"
                                className="gap-1 bg-green-600 hover:bg-green-700"
                              >
                                <Unlock className="size-3" />
                                Frigör utbetalning
                              </Button>
                            </form>
                          )}
                          {(placement.status === "guarantee_failed" ||
                            placement.status === "refund_processing") && (
                            <span className="inline-flex items-center gap-1 text-sm text-amber-600">
                              <AlertTriangle className="size-3" />
                              Kräver åtgärd
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={<Award className="size-10" />}
              title="Inga placeringar hittades"
              description="Det finns inga placeringar i denna kategori."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
