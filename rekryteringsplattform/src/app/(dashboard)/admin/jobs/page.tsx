import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";
import { getAdminJobs } from "@/lib/actions/admin";
import { getDictionary } from "@/i18n/server";
import { RecruiterFeeEditor } from "@/components/dashboard/admin/recruiter-fee-editor";
import { ApproveJobButton } from "@/components/dashboard/admin/approve-job-button";

export default async function AdminJobsPage() {
  const jobs = await getAdminJobs();
  const dict = await getDictionary();
  const a = dict.admin;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{a.jobsPageTitle}</h1>
        <p className="text-muted-foreground">{a.jobsPageSubtitle.replace("{count}", String(jobs.length))}</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-medium text-muted-foreground">{a.tableJobTitle}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableJobCompany}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableJobLocation}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableJobSalary}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableJobStatus}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableJobRecruiters}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableJobCandidates}</th>
                <th className="p-4 font-medium text-muted-foreground">Client Fee</th>
                <th className="p-4 font-medium text-emerald-700">Recruiter Fee %</th>
                <th className="p-4 font-medium text-muted-foreground">Approval</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">{a.noJobsRegistered}</td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="p-4 font-medium">{job.title}</td>
                    <td className="p-4">{job.company}</td>
                    <td className="p-4 text-muted-foreground">{job.location || dict.common.noDataDash}</td>
                    <td className="p-4">{job.salary ? formatCurrency(job.salary) : dict.common.notSpecifiedNeutral}</td>
                    <td className="p-4"><StatusBadge status={job.status} /></td>
                    <td className="p-4">{job.recruiters}/{job.maxRecruiters}</td>
                    <td className="p-4">{job.candidates}</td>
                    <td className="p-4 text-muted-foreground">{job.feePercentage ? `${job.feePercentage}%` : "—"}</td>
                    <td className="p-4">
                      <RecruiterFeeEditor jobId={job.id} initialFee={job.recruiterFeePercentage} />
                    </td>
                    <td className="p-4">
                      <ApproveJobButton jobId={job.id} status={job.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground px-1">
        💡 <strong>Recruiter Fee %</strong> is the percentage of annual salary paid to the recruiter on successful placement. Click any value to edit. Default is 7%.
      </p>
    </div>
  );
}
