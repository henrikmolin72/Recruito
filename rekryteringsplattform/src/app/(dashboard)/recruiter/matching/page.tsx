import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMatchedJobsForRecruiter } from "@/lib/matching/score";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Briefcase, Users, Sparkles } from "lucide-react";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";
import { ExclusivityBadge } from "@/components/jobs/exclusivity-badge";
import { InterviewBonusBadge } from "@/components/jobs/interview-bonus-badge";

export default async function RecruiterMatchingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recruiter } = await supabase
    .from("recruiters")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!recruiter || recruiter.approval_status !== "approved")
    redirect("/recruiter");

  const matchedJobs = await getMatchedJobsForRecruiter(recruiter.id);

  // Get existing mandates to show status
  const { data: myMandates } = await supabase
    .from("job_mandates")
    .select("job_id")
    .eq("recruiter_id", recruiter.id)
    .eq("is_active", true);
  const myMandateJobIds = new Set(myMandates?.map((m) => m.job_id) ?? []);

  // Group by score tiers
  const excellent = matchedJobs.filter((m) => m.score >= 80);
  const good = matchedJobs.filter((m) => m.score >= 60 && m.score < 80);
  const possible = matchedJobs.filter((m) => m.score >= 40 && m.score < 60);
  const low = matchedJobs.filter((m) => m.score < 40);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="size-6 text-brand-600" />
          <h1 className="text-2xl font-bold">AI-matchning</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Jobb rangordnade efter hur val de matchar din profil, erfarenhet och
          specialiseringar
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Utmarkt matchning</p>
            <p className="text-2xl font-bold text-green-700">
              {excellent.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Bra matchning</p>
            <p className="text-2xl font-bold text-blue-700">{good.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Mojlig matchning</p>
            <p className="text-2xl font-bold text-yellow-700">
              {possible.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Lag matchning</p>
            <p className="text-2xl font-bold text-gray-500">{low.length}</p>
          </CardContent>
        </Card>
      </div>

      {matchedJobs.length > 0 ? (
        <div className="space-y-4">
          {matchedJobs.map(({ job, score, reasons }) => {
            const company = (job as Record<string, unknown>).companies as
              | { company_name: string }
              | null;
            const isFull =
              (job.current_recruiter_count as number) >=
              (job.max_recruiters as number);
            const hasMandate = myMandateJobIds.has(job.id as string);
            const avgSalary =
              (job.salary_min as number) && (job.salary_max as number)
                ? Math.round(
                    ((job.salary_min as number) + (job.salary_max as number)) / 2
                  )
                : 0;
            const totalFee = avgSalary
              ? Math.round(avgSalary * ((job.fee_percentage as number) / 100))
              : 0;
            const recruiterFee = Math.round(totalFee * 0.75);

            return (
              <Card key={job.id as string}>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {job.title as string}
                        </h3>
                        <MatchScoreBadge
                          score={score}
                          reasons={reasons}
                          showReasons
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3.5" />
                          {company?.company_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          {job.location as string}
                        </span>
                        {(job.industry as string | null) ? (
                          <span className="flex items-center gap-1">
                            <Briefcase className="size-3.5" />
                            {job.industry as string}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <ExclusivityBadge
                          isExclusive={(job.is_exclusive as boolean) ?? false}
                          exclusivityEndDate={
                            (job.exclusivity_end_date as string) ?? null
                          }
                        />
                        <InterviewBonusBadge
                          showBonus={
                            (job.show_interview_bonus as boolean) ?? false
                          }
                        />
                        {hasMandate && (
                          <Badge className="bg-brand-600 text-xs">
                            Ditt mandat
                          </Badge>
                        )}
                        {isFull && (
                          <Badge variant="secondary" className="text-xs">
                            Fullt
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="size-3" />
                          {job.current_recruiter_count as number}/
                          {job.max_recruiters as number} rekryterare
                        </span>
                      </div>
                      {(job.salary_min as number) > 0 &&
                        (job.salary_max as number) > 0 && (
                          <div className="text-sm">
                            <span className="font-medium">
                              {formatCurrency(job.salary_min as number)} -{" "}
                              {formatCurrency(job.salary_max as number)}
                            </span>
                            {totalFee > 0 && (
                              <span className="ml-3 text-muted-foreground">
                                Avgift: {job.fee_percentage as number}% | Din
                                andel: ~{formatCurrency(recruiterFee)}
                              </span>
                            )}
                          </div>
                        )}
                      {/* Reasons breakdown */}
                      <div className="flex flex-wrap gap-1.5">
                        {reasons.map((reason, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs font-normal text-muted-foreground"
                          >
                            {reason}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Publicerad{" "}
                        {formatRelativeDate(
                          (job.published_at as string) ??
                            (job.created_at as string)
                        )}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Link href={`/recruiter/jobs/${job.id}`}>
                        <Button
                          className={
                            hasMandate
                              ? ""
                              : "bg-success-500 hover:bg-success-700"
                          }
                          variant={hasMandate ? "outline" : "default"}
                        >
                          {hasMandate
                            ? "Visa jobb"
                            : isFull
                              ? "Visa jobb"
                              : "Visa & ta mandat"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Sparkles className="size-10" />}
          title="Inga matchningar hittades"
          description="Det finns inga aktiva jobb att matcha just nu. Kom tillbaka snart!"
        />
      )}
    </div>
  );
}
