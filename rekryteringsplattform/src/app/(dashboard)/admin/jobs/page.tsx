import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
import { Briefcase, Pause, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

async function pauseJob(jobId: string) {
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
    .from("jobs")
    .update({ status: "paused" })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Kunde inte pausa jobbet: ${error.message}`);
  }

  await supabase.from("activity_log").insert({
    action_type: "job_paused",
    description: "Jobb pausat av admin",
    entity_type: "job",
    entity_id: jobId,
  });

  revalidatePath("/admin/jobs");
}

async function closeJob(jobId: string) {
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
    .from("jobs")
    .update({ status: "closed" })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Kunde inte stänga jobbet: ${error.message}`);
  }

  await supabase.from("activity_log").insert({
    action_type: "job_closed",
    description: "Jobb stängt av admin",
    entity_type: "job",
    entity_id: jobId,
  });

  revalidatePath("/admin/jobs");
}

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminJobsPage({ searchParams }: PageProps) {
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

  // Build query with company join
  let query = supabase
    .from("jobs")
    .select("*, companies(company_name)")
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: jobs } = await query;

  // Get candidate counts per job
  const jobIds = jobs?.map((j) => j.id) ?? [];
  let candidateCounts: Record<string, number> = {};

  if (jobIds.length > 0) {
    const { data: candidateData } = await supabase
      .from("candidates")
      .select("job_id")
      .in("job_id", jobIds);

    if (candidateData) {
      candidateCounts = candidateData.reduce(
        (acc: Record<string, number>, c) => {
          acc[c.job_id] = (acc[c.job_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }
  }

  const statuses = [
    { value: "all", label: "Alla" },
    { value: "active", label: "Aktiva" },
    { value: "paused", label: "Pausade" },
    { value: "filled", label: "Tillsatta" },
    { value: "closed", label: "Stängda" },
    { value: "draft", label: "Utkast" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jobb</h1>
        <p className="text-muted-foreground">
          Överblick och hantering av alla jobb på plattformen
        </p>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {statuses.map((s) => (
          <Link key={s.value} href={`/admin/jobs?status=${s.value}`}>
            <Button
              variant={statusFilter === s.value ? "default" : "outline"}
              size="sm"
            >
              {s.label}
            </Button>
          </Link>
        ))}
      </div>

      {jobs && jobs.length > 0 ? (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Företag</TableHead>
                <TableHead>Bransch</TableHead>
                <TableHead>Plats</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rekryterare</TableHead>
                <TableHead>Kandidater</TableHead>
                <TableHead>Skapad</TableHead>
                <TableHead className="text-right">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">
                    {job.title}
                  </TableCell>
                  <TableCell>
                    {(job as any).companies?.company_name || "-"}
                  </TableCell>
                  <TableCell>{job.industry || "-"}</TableCell>
                  <TableCell>{job.location || "-"}</TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell>
                    {job.current_recruiter_count}/{job.max_recruiters}
                  </TableCell>
                  <TableCell>{candidateCounts[job.id] ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(job.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {job.status === "active" && (
                        <form action={pauseJob.bind(null, job.id)}>
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            title="Pausa"
                          >
                            <Pause className="size-3" />
                            Pausa
                          </Button>
                        </form>
                      )}
                      {(job.status === "active" || job.status === "paused") && (
                        <form action={closeJob.bind(null, job.id)}>
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Stäng"
                          >
                            <XCircle className="size-3" />
                            Stäng
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
          icon={<Briefcase className="size-10" />}
          title="Inga jobb hittades"
          description={
            statusFilter !== "all"
              ? `Det finns inga jobb med status "${statuses.find((s) => s.value === statusFilter)?.label}".`
              : "Det finns inga jobb på plattformen ännu."
          }
        />
      )}
    </div>
  );
}
