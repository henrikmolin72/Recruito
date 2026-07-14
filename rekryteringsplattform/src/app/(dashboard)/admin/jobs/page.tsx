import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";
import { getAdminJobs } from "@/lib/actions/admin";
import { formatJobLocation } from "@/lib/format-job-location";
import { getDictionary } from "@/i18n/server";
import { JobFeeAmountEditor } from "@/components/dashboard/admin/job-fee-amount-editor";
import { RecruiterFeeEditor } from "@/components/dashboard/admin/recruiter-fee-editor";
import { ApproveJobButton } from "@/components/dashboard/admin/approve-job-button";
import { ApproveJobModal } from "@/components/dashboard/admin/approve-job-modal";
import { RequestChangesModal } from "@/components/dashboard/admin/request-changes-modal";
import { WithdrawReconfirmButton } from "@/components/dashboard/admin/withdraw-reconfirm-button";
import { formatDateShort } from "@/lib/utils";
import { MaxCandidatesEditor } from "@/components/dashboard/admin/max-candidates-editor";
import { MaxRecruitersEditor } from "@/components/dashboard/admin/max-recruiters-editor";

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
                <th className="p-4 font-medium text-muted-foreground">{a.tablePublishDate}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableJobCompany}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableJobLocation}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableJobSalary}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableJobStatus}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableJobRecruiters}</th>
                <th className="p-4 font-medium text-muted-foreground" title="Submitted / Cap">{a.tableJobCandidates} (cap)</th>
                <th className="p-4 font-medium text-muted-foreground">Original Fee</th>
                <th className="p-4 font-medium text-muted-foreground">Client Fee</th>
                <th className="p-4 font-medium text-emerald-700">Recruiter Fee</th>
                <th className="p-4 font-medium text-muted-foreground">Approval</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-muted-foreground">{a.noJobsRegistered}</td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="p-4 font-medium">
                      <Link href={`/admin/jobs/${job.id}`} className="text-brand-600 hover:underline">
                        {job.title}
                      </Link>
                    </td>
                    <td className="p-4 text-muted-foreground">{job.publishedAt ? formatDateShort(job.publishedAt) : dict.common.noDataDash}</td>
                    <td className="p-4">{job.company}</td>
                    <td className="p-4 text-muted-foreground">{formatJobLocation(job) || dict.common.noDataDash}</td>
                    <td className="p-4">{job.salary ? formatCurrency(job.salary) : dict.common.notSpecifiedNeutral}</td>
                    <td className="p-4">
                      <StatusBadge status={job.status} />
                      {job.status === "pending_approval" && job.resubmittedAt && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
                          {a.resubmittedBadge}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <MaxRecruitersEditor
                        jobId={job.id}
                        initialMax={job.maxRecruiters}
                        currentCount={job.recruiters}
                      />
                    </td>
                    <td className="p-4">
                      <MaxCandidatesEditor
                        jobId={job.id}
                        initialMax={job.maxCandidates}
                        currentCount={job.candidates}
                      />
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {job.clientFeeEstimated != null
                        ? formatCurrency(job.clientFeeEstimated, job.salaryCurrency)
                        : dict.common.noDataDash}
                    </td>
                    <td className="p-4">
                      <JobFeeAmountEditor
                        jobId={job.id}
                        initialAmount={job.clientFeeAmount}
                        currency={job.salaryCurrency}
                        field="client"
                      />
                    </td>
                    <td className="p-4 space-y-1">
                      <JobFeeAmountEditor
                        jobId={job.id}
                        initialAmount={job.recruiterFeeAmount}
                        currency={job.salaryCurrency}
                        field="recruiter"
                      />
                      <div className="text-[10px] text-muted-foreground">
                        <RecruiterFeeEditor jobId={job.id} initialFee={job.recruiterFeePercentage} />
                      </div>
                    </td>
                    <td className="p-4">
                      {job.status === "pending_approval" && (
                        <div className="space-y-1">
                          <ApproveJobModal
                            jobId={job.id}
                            status={job.status}
                            requiresUplift={
                              job.clientFeeAmount != null &&
                              job.clientFeeEstimated != null &&
                              Number(job.clientFeeAmount) > Number(job.clientFeeEstimated)
                            }
                          />
                          <RequestChangesModal jobId={job.id} />
                        </div>
                      )}
                      {job.status === "pending_client_reconfirm" && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Awaiting client re-confirm
                            {job.reconfirmRequestedAt
                              ? ` (sent ${formatDateShort(job.reconfirmRequestedAt)})`
                              : ""}
                          </p>
                          <WithdrawReconfirmButton jobId={job.id} />
                        </div>
                      )}
                      {job.status !== "pending_approval" && job.status !== "pending_client_reconfirm" && (
                        <ApproveJobButton jobId={job.id} status={job.status} />
                      )}
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
