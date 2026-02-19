import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Plus, MapPin, Users, Clock } from "lucide-react";
import { getCompanyJobs } from "@/lib/actions/jobs";
import { formatDate, formatCurrency } from "@/lib/utils";

export default async function CompanyJobsPage() {
  const jobs = await getCompanyJobs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jobb</h1>
          <p className="text-muted-foreground">Hantera dina jobbannonser</p>
        </div>
        <Link href="/company/jobs/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Skapa jobb
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {jobs.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border border-border border-dashed">
            <h3 className="text-lg font-medium">Inga jobb än</h3>
            <p className="text-muted-foreground mb-4">Skapa din första annons för att komma igång.</p>
            <Link href="/company/jobs/new">
              <Button>Skapa jobb</Button>
            </Link>
          </div>
        ) : (
          jobs.map((job: any) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{job.title}</h3>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
                      <span>
                        {job.salary_min ? `${formatCurrency(job.salary_min)} - ${formatCurrency(job.salary_max || job.salary_min)}` : 'Lön ej angiven'}
                      </span>
                      <span>{job.industry}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{job.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{job.recruiters_count}/{job.max_recruiters} rekryterare</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span>{job.candidates_count} kandidater</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Skapad {formatDate(job.created_at)}</span>
                  </div>
                  <div className="ml-auto">
                    <Link href={`/company/jobs/${job.id}`}>
                      <Button variant="outline" size="sm">Visa detaljer</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
