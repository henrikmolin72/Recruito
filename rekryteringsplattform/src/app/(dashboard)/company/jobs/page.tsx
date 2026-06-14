import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Info } from "lucide-react";
import { getCompanyJobs } from "@/lib/actions/jobs";
import { getDictionary } from "@/i18n/server";
import { CompanyJobsTable } from "./jobs-table";

export default async function CompanyJobsPage() {
  const jobs = await getCompanyJobs();
  const dict = await getDictionary();
  const c = dict.company;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{c.jobsPageTitle}</h1>
          <p className="text-muted-foreground">{c.jobsPageSubtitle}</p>
        </div>
        <Link href="/company/jobs/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> {c.createJob}
          </Button>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-border border-dashed">
          <h3 className="text-lg font-medium">{c.noJobsEmpty}</h3>
          <p className="text-muted-foreground mb-4">{c.noJobsEmptyDesc}</p>
          <Link href="/company/jobs/new">
            <Button>{c.createJob}</Button>
          </Link>
        </div>
      ) : (
        <CompanyJobsTable jobs={jobs} dict={c} />
      )}

      {/* Notifications & Important Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">{c.notificationsTitle || "Notifications"}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {c.notificationsBody || "Recruiters will receive an email and an in-platform (Recruito) notification whenever a job is paused or made live, along with the reason.\nPlease be careful when changing the job status."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">{c.importantNotesTitle || "Important Notes"}</h3>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li>{c.importantNote1 || "Once a job is published, the client cannot edit the job details. Please ensure all information is accurate before publishing."}</li>
                  <li>{c.importantNote2 || "Clients may add additional notes if something is missing after publication."}</li>
                  <li>{c.importantNote3 || "Alternatively, they can pause the job and publish a new one with updated details."}</li>
                  <li>{c.importantNote4 || "Once published, there is no option for the client to permanently delete the job."}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
