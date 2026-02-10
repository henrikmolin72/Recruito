import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatsCard } from "@/components/dashboard/stats-card";
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
import {
  Building2,
  UserSearch,
  Briefcase,
  Award,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  ExternalLink,
} from "lucide-react";
import { formatDate, formatRelativeDate, formatCurrency } from "@/lib/utils";
import { approveRecruiter, rejectRecruiter } from "./recruiters/actions";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/login");

  // Stats: Total companies
  const { count: totalCompanies } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true });

  // Stats: Total recruiters (approved + pending)
  const { count: totalRecruiters } = await supabase
    .from("recruiters")
    .select("*", { count: "exact", head: true });

  const { count: approvedRecruiters } = await supabase
    .from("recruiters")
    .select("*", { count: "exact", head: true })
    .eq("approval_status", "approved");

  const { count: pendingRecruiters } = await supabase
    .from("recruiters")
    .select("*", { count: "exact", head: true })
    .eq("approval_status", "pending");

  // Stats: Active jobs
  const { count: activeJobs } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  // Stats: Total placements
  const { count: totalPlacements } = await supabase
    .from("placements")
    .select("*", { count: "exact", head: true });

  // Stats: Platform revenue
  const { data: revenueData } = await supabase
    .from("placements")
    .select("platform_fee")
    .in("status", ["completed", "payout_released", "guarantee_active", "payment_received"]);

  const platformRevenue = revenueData?.reduce(
    (sum, p) => sum + (p.platform_fee || 0),
    0
  ) ?? 0;

  // Stats: Average time-to-hire
  const { data: hireTimeData } = await supabase
    .from("placements")
    .select("created_at, jobs(created_at)")
    .not("status", "eq", "cancelled");

  let avgTimeToHire = 0;
  if (hireTimeData && hireTimeData.length > 0) {
    const totalDays = hireTimeData.reduce((sum, p) => {
      const jobCreated = (p as any).jobs?.created_at;
      if (!jobCreated) return sum;
      const diff =
        new Date(p.created_at).getTime() - new Date(jobCreated).getTime();
      return sum + diff / (1000 * 60 * 60 * 24);
    }, 0);
    avgTimeToHire = Math.round(totalDays / hireTimeData.length);
  }

  // Pending recruiters for approval
  const { data: pendingRecruitersList } = await supabase
    .from("recruiters")
    .select("*")
    .eq("approval_status", "pending")
    .order("created_at", { ascending: false });

  // Recent activity log
  const { data: activityLog } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Översikt av plattformens aktivitet och statistik
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard
          title="Totalt företag"
          value={totalCompanies ?? 0}
          icon={<Building2 className="size-4" />}
        />
        <StatsCard
          title="Rekryterare"
          value={totalRecruiters ?? 0}
          description={`${approvedRecruiters ?? 0} godkända, ${pendingRecruiters ?? 0} väntande`}
          icon={<UserSearch className="size-4" />}
        />
        <StatsCard
          title="Aktiva jobb"
          value={activeJobs ?? 0}
          icon={<Briefcase className="size-4" />}
        />
        <StatsCard
          title="Placeringar"
          value={totalPlacements ?? 0}
          icon={<Award className="size-4" />}
        />
        <StatsCard
          title="Plattformsintäkt"
          value={formatCurrency(platformRevenue)}
          icon={<DollarSign className="size-4" />}
        />
        <StatsCard
          title="Snitt tid till anställning"
          value={`${avgTimeToHire} dagar`}
          icon={<Clock className="size-4" />}
        />
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Väntande godkännanden</CardTitle>
          <Link href="/admin/recruiters?status=pending">
            <Button variant="ghost" size="sm">
              Visa alla
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {pendingRecruitersList && pendingRecruitersList.length > 0 ? (
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead>Rubrik</TableHead>
                    <TableHead>Specialiseringar</TableHead>
                    <TableHead>LinkedIn</TableHead>
                    <TableHead>Registrerad</TableHead>
                    <TableHead className="text-right">Åtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRecruitersList.map((recruiter) => (
                    <TableRow key={recruiter.id}>
                      <TableCell className="font-medium">
                        {recruiter.full_name}
                      </TableCell>
                      <TableCell>
                        {recruiter.headline || "-"}
                      </TableCell>
                      <TableCell>
                        {recruiter.specializations?.length > 0
                          ? recruiter.specializations.join(", ")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {recruiter.linkedin_url ? (
                          <a
                            href={recruiter.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            Profil
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(recruiter.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <form action={approveRecruiter.bind(null, recruiter.id)}>
                            <Button
                              type="submit"
                              size="sm"
                              className="gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="size-3" />
                              Godkänn
                            </Button>
                          </form>
                          <form action={rejectRecruiter.bind(null, recruiter.id)}>
                            <Button
                              type="submit"
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                            >
                              <XCircle className="size-3" />
                              Neka
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={<CheckCircle className="size-8" />}
              title="Inga väntande godkännanden"
              description="Alla rekryterare har hanterats. Nya ansökningar visas här."
            />
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Senaste aktivitet</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLog && activityLog.length > 0 ? (
            <div className="space-y-3">
              {activityLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <div className="mt-0.5 rounded-full bg-muted p-1.5">
                    <Activity className="size-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{entry.description}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{entry.action_type}</span>
                      <span>&middot;</span>
                      <span>{formatRelativeDate(entry.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Activity className="size-8" />}
              title="Ingen aktivitet ännu"
              description="Plattformsaktivitet loggas automatiskt här."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
