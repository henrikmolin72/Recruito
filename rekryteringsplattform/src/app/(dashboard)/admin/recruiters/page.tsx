import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserSearch, CheckCircle, XCircle, Ban, RotateCcw } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  approveRecruiter,
  rejectRecruiter,
  suspendRecruiter,
  reactivateRecruiter,
} from "./actions";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminRecruitersPage({ searchParams }: PageProps) {
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

  // Build query
  let query = supabase
    .from("recruiters")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("approval_status", statusFilter);
  }

  const { data: recruiters } = await query;

  const statuses = [
    { value: "all", label: "Alla" },
    { value: "pending", label: "Väntande" },
    { value: "approved", label: "Godkända" },
    { value: "rejected", label: "Nekade" },
    { value: "suspended", label: "Avstängda" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rekryterare</h1>
        <p className="text-muted-foreground">
          Hantera och granska rekryterare på plattformen
        </p>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        {statuses.map((s) => (
          <Link key={s.value} href={`/admin/recruiters?status=${s.value}`}>
            <Button
              variant={statusFilter === s.value ? "default" : "outline"}
              size="sm"
            >
              {s.label}
            </Button>
          </Link>
        ))}
      </div>

      {recruiters && recruiters.length > 0 ? (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Namn</TableHead>
                <TableHead>E-post</TableHead>
                <TableHead>Specialiseringar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Betyg</TableHead>
                <TableHead>Placeringar</TableHead>
                <TableHead>Registrerad</TableHead>
                <TableHead className="text-right">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recruiters.map((recruiter) => (
                <TableRow key={recruiter.id}>
                  <TableCell className="font-medium">
                    {recruiter.full_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {recruiter.email}
                  </TableCell>
                  <TableCell>
                    {recruiter.specializations?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {recruiter.specializations
                          .slice(0, 3)
                          .map((spec: string) => (
                            <span
                              key={spec}
                              className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs"
                            >
                              {spec}
                            </span>
                          ))}
                        {recruiter.specializations.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{recruiter.specializations.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={recruiter.approval_status} />
                  </TableCell>
                  <TableCell>
                    {recruiter.average_rating
                      ? `${recruiter.average_rating.toFixed(1)} / 5`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {recruiter.successful_placements ?? 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(recruiter.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {recruiter.approval_status === "pending" && (
                        <>
                          <form
                            action={approveRecruiter.bind(null, recruiter.id)}
                          >
                            <Button
                              type="submit"
                              size="sm"
                              className="gap-1 bg-green-600 hover:bg-green-700"
                              title="Godkänn"
                            >
                              <CheckCircle className="size-3" />
                              Godkänn
                            </Button>
                          </form>
                          <form
                            action={rejectRecruiter.bind(null, recruiter.id)}
                          >
                            <Button
                              type="submit"
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                              title="Neka"
                            >
                              <XCircle className="size-3" />
                              Neka
                            </Button>
                          </form>
                        </>
                      )}
                      {recruiter.approval_status === "approved" && (
                        <form
                          action={suspendRecruiter.bind(null, recruiter.id)}
                        >
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Stäng av"
                          >
                            <Ban className="size-3" />
                            Stäng av
                          </Button>
                        </form>
                      )}
                      {(recruiter.approval_status === "suspended" ||
                        recruiter.approval_status === "rejected") && (
                        <form
                          action={reactivateRecruiter.bind(
                            null,
                            recruiter.id
                          )}
                        >
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="gap-1 text-green-600 hover:bg-green-50 hover:text-green-700"
                            title="Återaktivera"
                          >
                            <RotateCcw className="size-3" />
                            Återaktivera
                          </Button>
                        </form>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={<UserSearch className="size-10" />}
          title="Inga rekryterare hittades"
          description={
            statusFilter !== "all"
              ? `Det finns inga rekryterare med status "${statuses.find((s) => s.value === statusFilter)?.label}".`
              : "Det finns inga registrerade rekryterare ännu."
          }
        />
      )}
    </div>
  );
}
