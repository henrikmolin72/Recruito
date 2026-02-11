import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, MapPin, Building2, Users } from "lucide-react";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";
import { ExclusivityBadge } from "@/components/jobs/exclusivity-badge";

export default async function RecruiterJobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recruiter } = await supabase
    .from("recruiters")
    .select("id, approval_status")
    .eq("user_id", user.id)
    .single();
  if (!recruiter || recruiter.approval_status !== "approved") redirect("/recruiter");

  // Get jobs the recruiter already has mandates for
  const { data: myMandates } = await supabase
    .from("job_mandates")
    .select("job_id")
    .eq("recruiter_id", recruiter.id)
    .eq("is_active", true);
  const myMandateJobIds = new Set(myMandates?.map((m) => m.job_id) ?? []);

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, companies(company_name)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hitta jobb</h1>
        <p className="text-muted-foreground">Bläddra bland aktiva jobbannonser och ta mandat</p>
      </div>

      {jobs && jobs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => {
            const company = job.companies as any;
            const isFull = job.current_recruiter_count >= job.max_recruiters;
            const hasMandate = myMandateJobIds.has(job.id);
            const avgSalary = job.salary_min && job.salary_max
              ? Math.round((job.salary_min + job.salary_max) / 2) : 0;
            const totalFee = avgSalary ? Math.round(avgSalary * (job.fee_percentage / 100)) : 0;
            const recruiterFee = Math.round(totalFee * 0.75);

            return (
              <Card key={job.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="size-3.5" />
                    {company?.company_name}
                  </div>
                  <CardTitle className="text-base">
                    {job.title}
                  </CardTitle>
                  <ExclusivityBadge
                    isExclusive={job.is_exclusive ?? false}
                    exclusivityEndDate={job.exclusivity_end_date ?? null}
                  />
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {job.location}
                      <span className="text-xs">·</span>
                      {job.industry}
                    </div>
                    {job.salary_min && job.salary_max && (
                      <p className="font-medium">
                        {formatCurrency(job.salary_min)} - {formatCurrency(job.salary_max)}
                      </p>
                    )}
                    {totalFee > 0 && (
                      <div className="rounded-md bg-success-50 p-2 text-success-700">
                        <p>Avgift: {job.fee_percentage}% (~{formatCurrency(totalFee)})</p>
                        <p className="font-medium">Din andel: ~{formatCurrency(recruiterFee)}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="size-3.5" />
                      {job.current_recruiter_count}/{job.max_recruiters} rekryterare
                      {isFull && <Badge variant="secondary" className="text-xs">Fullt</Badge>}
                      {hasMandate && <Badge className="bg-brand-600 text-xs">Ditt mandat</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Publicerad {formatRelativeDate(job.published_at ?? job.created_at)}
                    </p>
                  </div>
                  <Link href={`/recruiter/jobs/${job.id}`}>
                    <Button
                      className={hasMandate ? "w-full" : "w-full bg-success-500 hover:bg-success-700"}
                      variant={hasMandate ? "outline" : "default"}
                    >
                      {hasMandate ? "Visa jobb" : isFull ? "Visa jobb" : "Visa & ta mandat"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Briefcase className="size-10" />}
          title="Inga jobb tillgängliga"
          description="Det finns inga aktiva jobb just nu. Kom tillbaka snart!"
        />
      )}
    </div>
  );
}
