import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { getRecruiterCandidates } from "@/lib/actions/recruiter";
import { formatDate, cn } from "@/lib/utils";
import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { candidateInStage, type MandateStage } from "@/lib/mandate-stages";
import { CANDIDATE_WITHDRAW_BLOCKED_STATUSES } from "@/lib/candidate-workflow";
import { Eye, EyeOff } from "lucide-react";
import { DraftRowActions } from "@/components/dashboard/recruiter/draft-row-actions";
import { PipelineWithdrawButton } from "@/components/dashboard/recruiter/pipeline-withdraw-button";

// Per the workflow spec the recruiter may withdraw only while the candidate is
// live in one of these stages — never from draft, rejected, withdrawn or hired.
// withdrawCandidate enforces the same rule server-side as the authoritative guard.
const WITHDRAWABLE_STAGES: MandateStage[] = ["submitted", "in_review", "interview", "final_interview", "offer"];

// A candidate can sit in a withdrawable *stage bucket* yet be in a terminal
// status the server rejects (e.g. duplicate_rejected/client_already_engaged live
// in the "submitted" bucket, offer_declined in "offer"). Gate on the same blocked
// set the server enforces so we never offer a Withdraw button that always errors.
function canWithdrawCandidate(candidate: { status: string | null }): boolean {
  if (CANDIDATE_WITHDRAW_BLOCKED_STATUSES.has(candidate.status ?? "")) return false;
  return WITHDRAWABLE_STAGES.some((s) => candidateInStage(candidate, s));
}

type PipelineTabKey =
  | "all"
  | "drafts"
  | "submitted"
  | "in_interview"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "hired";

export default async function RecruiterCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const candidates = await getRecruiterCandidates();
  const dict = await getDictionary();
  const r = dict.recruiter;

  // Status filter tabs. Each maps the client-facing tab onto the internal
  // mandate stages (see lib/mandate-stages). Combined buckets per product:
  //   - Submitted   = submitted-to-client + still-in-review (presented, not yet screened)
  //   - In Interview = interview + final interview
  //   - Rejected    = rejected (withdrawn has its own tab)
  const tabs: { key: PipelineTabKey; label: string; match: (c: any) => boolean }[] = [
    { key: "all", label: r.tabAllCandidates || "All candidates", match: () => true },
    { key: "drafts", label: r.tabDrafts || "Drafts", match: (c) => candidateInStage(c, "draft") },
    {
      key: "submitted",
      label: r.colSubmitted || "Submitted",
      match: (c) => candidateInStage(c, "submitted") || candidateInStage(c, "in_review"),
    },
    {
      key: "in_interview",
      label: r.colInInterview || "In Interview",
      match: (c) => candidateInStage(c, "interview") || candidateInStage(c, "final_interview"),
    },
    { key: "offer", label: r.tabOffer || "Offer", match: (c) => candidateInStage(c, "offer") },
    {
      key: "rejected",
      label: r.colRejected || "Rejected",
      match: (c) => candidateInStage(c, "rejected"),
    },
    {
      key: "withdrawn",
      label: r.colWithdrawn || "Withdrawn",
      match: (c) => candidateInStage(c, "withdrawn"),
    },
    { key: "hired", label: r.colHired || "Hired", match: (c) => candidateInStage(c, "hired") },
  ];

  const { tab } = await searchParams;
  const activeTab: PipelineTabKey = tabs.some((t) => t.key === tab) ? (tab as PipelineTabKey) : "all";
  const counts = new Map(tabs.map((t) => [t.key, candidates.filter(t.match).length]));
  const activeMatch = tabs.find((t) => t.key === activeTab)!.match;
  const visibleCandidates = candidates.filter(activeMatch);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{r.pipelineTitle || "Candidate Pipeline"}</h1>
        <p className="text-muted-foreground">{r.candidatesPageSubtitle}</p>
      </div>

      {candidates.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
          <p className="text-muted-foreground">{r.noCandidatesPresentedProfile}</p>
          <Link href="/recruiter/mandates">
            <Button variant="outline" size="sm" className="mt-4">{r.goToMandates}</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => {
              const isActive = t.key === activeTab;
              return (
                <Link
                  key={t.key}
                  href={t.key === "all" ? "/recruiter/candidates" : `/recruiter/candidates?tab=${t.key}`}
                  scroll={false}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-brand-200"
                  )}
                >
                  <span>{t.label}</span>
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
                      isActive ? "bg-brand-600 text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {counts.get(t.key)}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="grid gap-4">
            {visibleCandidates.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
                <p className="text-muted-foreground">{r.tabEmptyFilter || "No candidates in this view"}</p>
              </div>
            ) : (
              visibleCandidates.map((candidate: any) => {
                const company = Array.isArray(candidate.job?.company) ? candidate.job.company[0] : candidate.job?.company;
                // "Last updated" reflects the most recent status change (or row update).
                const lastUpdated = candidate.status_changed_at || candidate.updated_at || candidate.created_at;
                const seen = !!candidate.company_viewed_at;

                return (
                  <Card key={candidate.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <Avatar initials={(candidate.first_name?.[0] || "") + (candidate.last_name?.[0] || "")} size="lg" />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold">
                              {(candidate.first_name || candidate.last_name)
                                ? `${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim()
                                : (r.unnamedDraft || "Unnamed draft")}
                            </h3>
                            <StatusBadge status={candidate.status} />
                            {candidate.status !== "draft" && (
                              <span className={`inline-flex items-center gap-1 text-xs font-medium ${seen ? "text-emerald-600" : "text-muted-foreground"}`}>
                                {seen ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                {seen ? (r.seenLabel || "Seen") : (r.notSeenLabel || "Not seen")}
                              </span>
                            )}
                          </div>
                          {candidate.current_title && (
                            <p className="text-sm text-muted-foreground">{candidate.current_title}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {candidate.job?.title || dict.common.unknownJob} — {company?.company_name || dict.common.unknownCompany} — {r.presentedDate.replace("{date}", formatDate(candidate.created_at))}
                          </p>
                          {lastUpdated && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(r.lastUpdatedLabel || "Last updated")}: {formatDate(lastUpdated)}
                            </p>
                          )}
                        </div>
                        {candidate.status === "draft" ? (
                          <DraftRowActions
                            mandateId={candidate.mandate_id}
                            draftId={candidate.id}
                            resumeLabel={r.resume}
                            deleteLabel={r.remove}
                            confirmLabel={r.removeDraftConfirm}
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            {canWithdrawCandidate(candidate) && (
                              <PipelineWithdrawButton
                                candidateId={candidate.id}
                                jobId={candidate.job_id}
                                candidateName={`${candidate.first_name ?? ""} ${candidate.last_name ?? ""}`.trim()}
                                labels={{
                                  withdraw: r.withdraw,
                                  title: r.withdrawCandidate,
                                  warning: r.withdrawConfirmWarning,
                                  selectReason: r.pipelineSelectReason,
                                  confirm: r.withdrawCandidate,
                                  cancel: dict.common.cancel,
                                  updating: r.updating,
                                  errorFallback: r.pipelineUpdateError,
                                }}
                              />
                            )}
                            <Link href={`/recruiter/mandates/${candidate.mandate_id}/candidates/${candidate.id}`}>
                              <Button variant="outline" size="sm">{dict.common.details}</Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
