import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Info } from "lucide-react";
import { getCompanyJobs } from "@/lib/actions/jobs";
import { formatCurrency, formatDateShort, calculateClientFee } from "@/lib/utils";
import { getDictionary } from "@/i18n/server";

export default async function CompanyJobsPage() {
  const jobs = await getCompanyJobs();
  const dict = await getDictionary();
  const c = dict.company;

  function formatGuarantee(months: number | null | undefined) {
    if (!months) return "—";
    return months === 1
      ? (c.guaranteeMonths || "{count} month").replace("{count}", String(months))
      : (c.guaranteeMonthsPlural || "{count} months").replace("{count}", String(months));
  }

  function formatSalaryRange(job: any) {
    if (!job.salary_max && !job.salary_min) return "—";
    const currency = job.salary_currency || "EUR";
    return formatCurrency(job.salary_max || job.salary_min, currency);
  }

  function calculateJobFee(job: any) {
    const currency = job.salary_currency || "EUR";
    // Locked fee wins — set on creation/admin override and never recomputed.
    if (job.client_fee_amount != null) {
      return formatCurrency(Number(job.client_fee_amount), currency);
    }
    const baseSalary = job.salary_max || job.salary_min;
    if (!baseSalary) return "—";
    return formatCurrency(
      calculateClientFee(baseSalary, job.guarantee_period_months ?? 0, !!job.is_exclusive),
      currency,
    );
  }

  function getStatusDisplay(status: string) {
    if (status === "active") return { label: c.statusLive || "Live", color: "text-success-500" };
    if (status === "paused") return { label: c.statusPaused || "Paused", color: "text-danger-500" };
    if (status === "draft") return { label: "Draft", color: "text-amber-500" };
    if (status === "closed") return { label: "Closed", color: "text-muted-foreground" };
    return { label: status, color: "text-muted-foreground" };
  }

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
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold text-foreground">{c.tableTitle || "Job"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">{c.tableCity || "City"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">{c.tableSalary || "Salary"}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{c.tableCandidates}</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">{c.tableFee || "Fee"}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{c.tableGuarantee || "Guarantee"}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{c.tableRecruiters}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{c.tableStatus}</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">{c.tablePublished || "Published"}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{c.tableEdit || "Edit"}</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job: any) => {
                    const { label: statusLabel, color: statusColor } = getStatusDisplay(job.status);
                    return (
                      <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/company/jobs/${job.id}`} className="hover:text-brand-600 transition-colors">
                            {job.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{job.city || job.location || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatSalaryRange(job)}</td>
                        <td className="px-4 py-3 text-center">{job.candidates_count}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{calculateJobFee(job)}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{formatGuarantee(job.guarantee_period_months)}</td>
                        <td className="px-4 py-3 text-center">{job.recruiters_count}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${statusColor}`}>{statusLabel}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateShort(job.published_at || job.created_at)}</td>
                        <td className="px-4 py-3 text-center">
                          {job.status === 'draft' ? (
                            <Link href={`/company/jobs/${job.id}/edit`}>
                              <Button variant="outline" size="sm">{c.tableEdit || "Edit"}</Button>
                            </Link>
                          ) : (
                            <Link href={`/company/jobs/${job.id}`}>
                              <Button variant="outline" size="sm">{c.tableView || "View"}</Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
