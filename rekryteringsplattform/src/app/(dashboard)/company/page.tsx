import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatsCard } from "@/components/dashboard/stats-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, CalendarCheck, Award, Plus } from "lucide-react";

export default async function CompanyDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!company) redirect("/login");

  // Fetch stats
  const { count: activeJobsCount } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company.id)
    .in("status", ["active", "paused"]);

  const { count: candidatesCount } = await supabase
    .from("candidates")
    .select("*, jobs!inner(company_id)", { count: "exact", head: true })
    .eq("jobs.company_id", company.id);

  const { count: interviewsCount } = await supabase
    .from("candidates")
    .select("*, jobs!inner(company_id)", { count: "exact", head: true })
    .eq("jobs.company_id", company.id)
    .eq("status", "interview");

  const { count: placementsCount } = await supabase
    .from("placements")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company.id);

  // Recent jobs
  const { data: recentJobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent candidates
  const { data: recentCandidates } = await supabase
    .from("candidates")
    .select("*, jobs!inner(company_id, title)")
    .eq("jobs.company_id", company.id)
    .order("submitted_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Välkommen, {company.company_name}
          </h1>
          <p className="text-muted-foreground">
            Här är en översikt av din rekryteringsaktivitet
          </p>
        </div>
        <Link href="/company/jobs/new">
          <Button>
            <Plus className="mr-2 size-4" />
            Nytt jobb
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Aktiva jobb"
          value={activeJobsCount ?? 0}
          icon={<Briefcase className="size-4" />}
        />
        <StatsCard
          title="Presenterade kandidater"
          value={candidatesCount ?? 0}
          icon={<Users className="size-4" />}
        />
        <StatsCard
          title="Pågående intervjuer"
          value={interviewsCount ?? 0}
          icon={<CalendarCheck className="size-4" />}
        />
        <StatsCard
          title="Lyckade placeringar"
          value={placementsCount ?? 0}
          icon={<Award className="size-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Aktiva jobb</CardTitle>
            <Link href="/company/jobs">
              <Button variant="ghost" size="sm">
                Visa alla
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentJobs && recentJobs.length > 0 ? (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/company/jobs/${job.id}`}
                    className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted"
                  >
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.location} · {job.current_recruiter_count}/{job.max_recruiters} rekryterare
                      </p>
                    </div>
                    <StatusBadge status={job.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Briefcase className="size-8" />}
                title="Inga jobb ännu"
                description="Skapa din första jobbannons för att börja ta emot kandidater."
                action={
                  <Link href="/company/jobs/new">
                    <Button size="sm">Skapa jobb</Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Senaste kandidater</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCandidates && recentCandidates.length > 0 ? (
              <div className="space-y-3">
                {recentCandidates.map((candidate) => (
                  <Link
                    key={candidate.id}
                    href={`/company/candidates/${candidate.id}`}
                    className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted"
                  >
                    <div>
                      <p className="font-medium">
                        {candidate.first_name} {candidate.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {candidate.current_title} · {(candidate as any).jobs?.title}
                      </p>
                    </div>
                    <StatusBadge status={candidate.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Users className="size-8" />}
                title="Inga kandidater ännu"
                description="Kandidater visas här när rekryterare presenterar dem för dina jobb."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
