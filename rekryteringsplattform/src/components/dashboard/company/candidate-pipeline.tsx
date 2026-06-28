"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { CandidateAccessGate } from "@/components/dashboard/company/candidate-access-gate";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import { normalizeCandidateStatusForWorkflow } from "@/lib/candidate-workflow";

function getColumnKey(status: string) {
  const normalized = normalizeCandidateStatusForWorkflow(status);
  if (["submitted", "under_client_review", "info_requested", "resubmitted"].includes(normalized)) return "reviewing";
  if (["interview_stage_1", "interview_stage_2", "interview_stage_3"].includes(normalized)) return "interview";
  if (normalized === "final_interview") return "final_interview";
  if (["offer_in_progress", "offer_accepted"].includes(normalized)) return "offered";
  if (["on_hold"].includes(normalized)) return "paused";
  if (normalized === "candidate_withdrawn") return "withdrawn";
  if (["duplicate_rejected", "client_already_engaged", "rejected_client", "rejected_interview", "offer_declined"].includes(normalized)) return "rejected";
  if (["invoice_enabled", "guarantee_tracking"].includes(normalized)) return "hired";
  return normalized;
}

interface CandidatePipelineProps {
  candidates: any[];
  noticeAccepted: boolean;
}

export function CandidatePipeline({ candidates, noticeAccepted }: CandidatePipelineProps) {
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const { t } = useTranslations();

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView("pipeline")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all",
            view === "pipeline" ? "bg-brand-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {t("common.pipeline")}
        </button>
        <button
          onClick={() => setView("list")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all",
            view === "list" ? "bg-brand-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {t("common.list")}
        </button>
        <div className="ml-auto text-sm text-muted-foreground font-medium">
          {t("common.candidatesTotalCount").replace("{count}", String(candidates.length))}
        </div>
      </div>

      {view === "pipeline" ? (
        <PipelineView candidates={candidates} noticeAccepted={noticeAccepted} />
      ) : (
        <ListView candidates={candidates} noticeAccepted={noticeAccepted} />
      )}
    </div>
  );
}

function PipelineView({ candidates, noticeAccepted }: { candidates: any[]; noticeAccepted: boolean }) {
  const { t } = useTranslations();

  const PIPELINE_STAGES = [
    { key: "submitted", label: t("components.pipelinePresented"), color: "bg-blue-500" },
    { key: "reviewing", label: t("components.pipelineUnderReview"), color: "bg-yellow-500" },
    { key: "interview", label: t("components.pipelineInterview"), color: "bg-purple-500" },
    { key: "final_interview", label: t("components.pipelineFinalInterview"), color: "bg-violet-500" },
    { key: "offered", label: t("components.pipelineOffer"), color: "bg-brand-500" },
    { key: "hired", label: t("components.pipelineHired"), color: "bg-success-500" },
    { key: "paused", label: t("components.pipelinePaused"), color: "bg-orange-400" },
    { key: "rejected", label: t("components.pipelineRejected"), color: "bg-slate-400" },
    { key: "withdrawn", label: t("components.pipelineWithdrawn"), color: "bg-zinc-400" },
  ] as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {PIPELINE_STAGES.map((stage) => {
        const stageCandidates = candidates.filter(c => getColumnKey(c.status) === stage.key);

        return (
          <div key={stage.key} className="space-y-3">
            {/* Stage header */}
            <div className="flex items-center gap-2 px-1">
              <div className={cn("h-2.5 w-2.5 rounded-full", stage.color)} />
              <span className="text-sm font-bold text-slate-700">{stage.label}</span>
              <span className="ml-auto text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {stageCandidates.length}
              </span>
            </div>

            {/* Candidates in stage */}
            <div className="space-y-2 min-h-[80px]">
              {stageCandidates.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                  {t("common.noCandidates")}
                </div>
              ) : (
                stageCandidates.map((candidate: any) => (
                  <Card key={candidate.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar initials={(candidate.first_name?.[0] || "") + (candidate.last_name?.[0] || "")} />
                        <div className="flex-1 min-w-0">
                          <CandidateAccessGate
                            href={`/company/jobs/${candidate.job_id}/candidates/${candidate.id}`}
                            noticeAccepted={noticeAccepted}
                            className="font-semibold text-sm hover:text-brand-600 transition-colors"
                          >
                            {candidate.first_name} {candidate.last_name}
                          </CandidateAccessGate>
                          <p className="text-xs text-muted-foreground truncate">
                            {candidate.current_title || t("common.noTitle")}
                          </p>
                          <p className="text-[10px] text-brand-600 font-medium mt-1">
                            {candidate.job?.title}
                          </p>
                        </div>
                      </div>

                      {/* Company view is now request-driven from candidate detail; keep pipeline cards read-only */}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ candidates, noticeAccepted }: { candidates: any[]; noticeAccepted: boolean }) {
  const { t } = useTranslations();

  return (
    <div className="grid gap-4">
      {candidates.map((candidate: any) => (
        <Card key={candidate.id}>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar initials={(candidate.first_name?.[0] || "") + (candidate.last_name?.[0] || "")} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{candidate.first_name} {candidate.last_name}</h3>
                  <StatusBadge status={candidate.status} />
                </div>
                {candidate.current_title && (
                  <p className="text-sm text-muted-foreground line-clamp-2 break-words">{candidate.current_title}</p>
                )}
                {candidate.company_requested_next_step_note && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words">
                    {candidate.company_requested_next_step_note}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">{t("components.recruiterJobsListJobLabel")} <span className="text-foreground font-medium">{candidate.job?.title}</span></span>
                  <span className="flex items-center gap-1">{t("components.recruiterJobsListPresentedLabel")} <span className="text-foreground font-medium">{new Date(candidate.created_at).toLocaleDateString()}</span></span>
                </div>
              </div>
              <div className="flex gap-2">
                <CandidateAccessGate
                  href={`/company/jobs/${candidate.job_id}/candidates/${candidate.id}`}
                  noticeAccepted={noticeAccepted}
                >
                  <Button variant="outline" size="sm">{t("common.showProfile")}</Button>
                </CandidateAccessGate>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
