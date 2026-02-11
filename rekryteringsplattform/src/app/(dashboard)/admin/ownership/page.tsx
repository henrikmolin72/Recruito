import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllOwnership } from "@/lib/ownership/actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Shield, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

function getDaysRemaining(ownershipEnd: string): number {
  const end = new Date(ownershipEnd);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusBadge(status: string, ownershipEnd: string) {
  const daysRemaining = getDaysRemaining(ownershipEnd);

  if (status === "claimed") {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        Utnyttjad
      </Badge>
    );
  }

  if (status === "disputed") {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        Omtvistad
      </Badge>
    );
  }

  if (status === "expired" || daysRemaining <= 0) {
    return (
      <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
        Utgånget
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      Aktivt
    </Badge>
  );
}

export default async function AdminOwnershipPage() {
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

  const ownership = await getAllOwnership();

  // Fetch recruiter profile names for display
  const recruiterUserIds = [
    ...new Set(
      ownership
        .map((o) => (o.recruiters as any)?.user_id)
        .filter(Boolean)
    ),
  ];
  const { data: recruiterProfiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", recruiterUserIds.length > 0 ? recruiterUserIds : ["__none__"]);

  const profileMap = new Map(
    (recruiterProfiles ?? []).map((p) => [p.id, p.full_name])
  );

  const activeCount = ownership.filter(
    (o) => o.status === "active" && getDaysRemaining(o.ownership_end) > 0
  ).length;
  const claimedCount = ownership.filter((o) => o.status === "claimed").length;
  const disputedCount = ownership.filter(
    (o) => o.status === "disputed"
  ).length;
  const totalCount = ownership.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kandidatskydd</h1>
        <p className="text-muted-foreground">
          Administrera alla kandidatskydd i plattformen
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Totalt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Aktiva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Utnyttjade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{claimedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">
              Omtvistade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {disputedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {ownership.length > 0 ? (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kandidat</TableHead>
                <TableHead>Rekryterare</TableHead>
                <TableHead>Foretag</TableHead>
                <TableHead>Jobb</TableHead>
                <TableHead>Skydd fran</TableHead>
                <TableHead>Skydd till</TableHead>
                <TableHead>Aterstaende</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ownership.map((record) => {
                const daysRemaining = getDaysRemaining(record.ownership_end);
                const recruiterUserId = (record.recruiters as any)?.user_id;
                const recruiterName = recruiterUserId
                  ? profileMap.get(recruiterUserId) ?? "-"
                  : "-";

                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.candidate_name}
                    </TableCell>
                    <TableCell>{recruiterName}</TableCell>
                    <TableCell>
                      {(record.companies as any)?.company_name || "-"}
                    </TableCell>
                    <TableCell>
                      {(record.jobs as any)?.title || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(record.ownership_start)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(record.ownership_end)}
                    </TableCell>
                    <TableCell>
                      {daysRemaining > 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                          <Clock className="size-3" />
                          {daysRemaining} dagar
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          --
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(record.status, record.ownership_end)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={<Shield className="size-10" />}
          title="Inga kandidatskydd"
          description="Det finns inga kandidatskydd registrerade i systemet annu."
        />
      )}
    </div>
  );
}
