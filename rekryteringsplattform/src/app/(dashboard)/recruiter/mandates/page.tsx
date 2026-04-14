import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Eye, UserPlus } from "lucide-react";
import { getRecruiterMandates } from "@/lib/actions/recruiter";
import { getDictionary } from "@/i18n/server";
import { formatDateShort } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";

const SUBMITTED_STATUSES = new Set([
  "under_client_review", "info_requested", "resubmitted",
  "submitted_to_client", "client_already_engaged", "duplicate_rejected",
]);
const INTERVIEW_STATUSES = new Set([
  "interview", "interview_stage_1", "interview_stage_2",
  "interview_stage_3", "final_interview",
]);
const OFFER_STATUSES = new Set([
  "offer_in_progress", "offer_accepted", "offer_declined",
]);
const HIRED_STATUSES = new Set([
  "hired", "invoice_enabled", "guarantee_tracking", "completed",
  "guarantee_active", "payout_released", "guarantee_period",
]);
const REJECTED_STATUSES = new Set([
  "rejected", "declined", "rejected_client", "rejected_interview",
  "candidate_withdrawn", "guarantee_failed", "recruiter_rejected",
]);

function CountBadge({ count, colorClass }: { count: number; colorClass: string }) {
  return (
    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mx-auto ${count > 0 ? colorClass : "bg-slate-100 text-slate-400"}`}>
      {count}
    </div>
  );
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export default async function RecruiterMandatesPage() {
  const mandates = await getRecruiterMandates();
  const dict = await getDictionary();
  const r = dict.recruiter;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{r.mandatesPageTitle}</h1>
        <p className="text-muted-foreground">
          {r.mandatesPageSubtitle.replace("{count}", String(mandates.length))}
        </p>
      </div>

      {mandates.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-border border-dashed">
          <h3 className="text-lg font-medium">{r.noMandatesTitle}</h3>
          <p className="text-muted-foreground mb-4">{r.noMandatesDesc}</p>
          <Link href="/recruiter/jobs">
            <Button>{r.findJobs}</Button>
          </Link>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold text-foreground" rowSpan={2}>
                      {r.tableJobTitle || "Job title"}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground" rowSpan={2}>
                      {r.tableCompany || "Company"}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground" rowSpan={2}>
                      {r.tableLocation || "Location"}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground border-l border-border" colSpan={5}>
                      {r.myCandidates || "My candidates"}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground border-l border-border" rowSpan={2}>
                      {r.tableJoined || "Joined"}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground" rowSpan={2}>
                      {r.tableExpireIn || "Expire in"}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground" rowSpan={2}>
                      {r.tableMessages || "Messages"}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground" rowSpan={2}>
                      {r.tableView || "View"}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground" rowSpan={2}>
                      {r.referCandidate || "Refer a Candidate"}
                    </th>
                  </tr>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground border-l border-border">
                      {r.colSubmitted || "Submitted"}
                    </th>
                    <th className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
                      {r.colInInterview || "In Interview"}
                    </th>
                    <th className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
                      {r.colJobOffer || "Job Offer"}
                    </th>
                    <th className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
                      {r.colHired || "Hired"}
                    </th>
                    <th className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
                      {r.colRejected || "Rejected"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mandates.map((mandate: any) => {
                    const submitted = mandate.candidates.filter((c: any) => SUBMITTED_STATUSES.has(c.status)).length;
                    const interview = mandate.candidates.filter((c: any) => INTERVIEW_STATUSES.has(c.status)).length;
                    const offer = mandate.candidates.filter((c: any) => OFFER_STATUSES.has(c.status)).length;
                    const hired = mandate.candidates.filter((c: any) => HIRED_STATUSES.has(c.status)).length;
                    const rejected = mandate.candidates.filter((c: any) => REJECTED_STATUSES.has(c.status)).length;
                    const clientViewed = mandate.candidates.some(
                      (c: any) => INTERVIEW_STATUSES.has(c.status) || OFFER_STATUSES.has(c.status) || HIRED_STATUSES.has(c.status)
                    );
                    const days = daysUntil(mandate.application_deadline);

                    return (
                      <tr key={mandate.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors align-middle">
                        {/* Job title */}
                        <td className="px-4 py-3 min-w-[180px]">
                          <Link
                            href={`/recruiter/mandates/${mandate.id}`}
                            className="font-semibold hover:text-brand-600 transition-colors leading-snug"
                          >
                            {mandate.title}
                          </Link>
                          <div className="mt-1">
                            <StatusBadge status={mandate.status} />
                          </div>
                        </td>

                        {/* Company */}
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {mandate.company}
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {mandate.location || "—"}
                        </td>

                        {/* Submitted */}
                        <td className="px-3 py-3 text-center border-l border-border">
                          <CountBadge count={submitted} colorClass="bg-blue-100 text-blue-700" />
                        </td>

                        {/* In Interview */}
                        <td className="px-3 py-3 text-center">
                          <CountBadge count={interview} colorClass="bg-purple-100 text-purple-700" />
                        </td>

                        {/* Job Offer */}
                        <td className="px-3 py-3 text-center">
                          <CountBadge count={offer} colorClass="bg-amber-100 text-amber-700" />
                        </td>

                        {/* Hired */}
                        <td className="px-3 py-3 text-center">
                          <CountBadge count={hired} colorClass="bg-green-100 text-green-700" />
                        </td>

                        {/* Rejected */}
                        <td className="px-3 py-3 text-center">
                          <CountBadge count={rejected} colorClass="bg-red-100 text-red-700" />
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap border-l border-border">
                          {mandate.claimed_at ? formatDateShort(mandate.claimed_at) : "—"}
                        </td>

                        {/* Expire in */}
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {days === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : days <= 0 ? (
                            <span className="text-danger-500 font-semibold">Expired</span>
                          ) : days <= 7 ? (
                            <span className="text-amber-600 font-semibold">{days}d</span>
                          ) : (
                            <span className="text-muted-foreground">{days}d</span>
                          )}
                        </td>

                        {/* Messages */}
                        <td className="px-4 py-3 text-center">
                          <Link
                            href="/recruiter/messages"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Link>
                        </td>

                        {/* View (client viewed candidate?) */}
                        <td className="px-4 py-3 text-center">
                          {clientViewed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-600 bg-success-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                              <Eye className="h-3 w-3" />
                              {r.viewed || "Viewed"}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Refer a Candidate */}
                        <td className="px-4 py-3 text-center">
                          <Link href={`/recruiter/mandates/${mandate.id}/candidates/new`}>
                            <Button
                              size="sm"
                              className="gap-1.5 bg-brand-600 hover:bg-brand-700 text-white whitespace-nowrap text-xs"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              {r.referCandidate || "Refer a Candidate"}
                            </Button>
                          </Link>
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
    </div>
  );
}
