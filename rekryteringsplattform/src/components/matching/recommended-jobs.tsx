import { getMatchedJobsForRecruiter } from "@/lib/matching/score";
import { MatchScoreBadge } from "./match-score-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Briefcase } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RecommendedJobsProps {
  recruiterId: string;
  limit?: number;
}

export async function RecommendedJobs({
  recruiterId,
  limit = 5,
}: RecommendedJobsProps) {
  const matchedJobs = await getMatchedJobsForRecruiter(recruiterId);
  const topJobs = matchedJobs.slice(0, limit);

  if (topJobs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Rekommenderade jobb</CardTitle>
        <Link href="/recruiter/matching">
          <Button variant="ghost" size="sm">
            Visa alla
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topJobs.map(({ job, score, reasons }) => {
            const company = (job as Record<string, unknown>).companies as
              | { company_name: string }
              | null;
            return (
              <Link
                key={job.id as string}
                href={`/recruiter/jobs/${job.id}`}
                className="flex items-center justify-between gap-4 rounded-md border p-3 transition-colors hover:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">
                      {job.title as string}
                    </p>
                    <MatchScoreBadge score={score} reasons={reasons} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
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
                    {(job.salary_min as number) > 0 &&
                      (job.salary_max as number) > 0 && (
                        <span>
                          {formatCurrency(job.salary_min as number)} -{" "}
                          {formatCurrency(job.salary_max as number)}
                        </span>
                      )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
