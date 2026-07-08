"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { CandidateAccessGate } from "@/components/dashboard/company/candidate-access-gate";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import {
  companyStageBucket,
  COMPANY_STAGE_BUCKETS,
  type CompanyStageBucket,
} from "@/lib/company-candidate-buckets";
import { ViewedIndicator } from "./viewed-indicator";

interface CandidatePipelineProps {
  candidates: any[];
  noticeAccepted: boolean;
}

const BUCKET_META: Record<CompanyStageBucket, { labelKey: string; dot: string }> = {
  under_review: { labelKey: "components.pipelineUnderReview", dot: "bg-yellow-500" },
  interview: { labelKey: "components.pipelineInterview", dot: "bg-purple-500" },
  offered: { labelKey: "components.pipelineOffer", dot: "bg-brand-500" },
  hired: { labelKey: "components.pipelineHired", dot: "bg-success-500" },
  rejected: { labelKey: "components.pipelineRejected", dot: "bg-slate-400" },
  withdrawn: { labelKey: "components.pipelineWithdrawn", dot: "bg-zinc-400" },
};

export function CandidatePipeline({ candidates, noticeAccepted }: CandidatePipelineProps) {
  const { t } = useTranslations();
  const [activeTab, setActiveTab] = useState<"all" | CompanyStageBucket>("all");
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");

  const counts = useMemo(() => {
    const c = {} as Record<CompanyStageBucket, number>;
    for (const bucket of COMPANY_STAGE_BUCKETS) c[bucket] = 0;
    for (const cand of candidates) c[companyStageBucket(cand.status)]++;
    return c;
  }, [candidates]);

  const jobs = useMemo(() => {
    const map = new Map<string, string>();
    for (const cand of candidates) {
      if (cand.job?.id) map.set(cand.job.id, cand.job.title);
    }
    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((cand) => {
      if (activeTab !== "all" && companyStageBucket(cand.status) !== activeTab) return false;
      if (jobFilter !== "all" && cand.job?.id !== jobFilter) return false;
      if (q && !`${cand.first_name || ""} ${cand.last_name || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [candidates, activeTab, jobFilter, search]);

  return (
    <div className="space-y-4">
      {/* Stage tabs */}
      <div className="flex items-center gap-2 overflow-x-auto rounded-xl border bg-card p-2">
        <button
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
            activeTab === "all"
              ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {t("components.pipelineAll")}
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
            {candidates.length}
          </span>
        </button>
        {COMPANY_STAGE_BUCKETS.map((bucket) => (
          <button
            key={bucket}
            onClick={() => setActiveTab(bucket)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              activeTab === bucket
                ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", BUCKET_META[bucket].dot)} />
            {t(BUCKET_META[bucket].labelKey)}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
              {counts[bucket]}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("components.candidateSearchPlaceholder")}
          className="h-9 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-brand-200 sm:max-w-xs"
        />
        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="h-9 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-brand-200 sm:w-auto"
        >
          <option value="all">{t("components.candidateAllJobs")}</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>{job.title}</option>
          ))}
        </select>
        <div className="text-sm font-medium text-muted-foreground sm:ml-auto">
          {t("common.candidatesTotalCount").replace("{count}", String(filtered.length))}
        </div>
      </div>

      {/* Candidate list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
          {t("common.noCandidates")}
        </div>
      ) : (
        <ListView candidates={filtered} noticeAccepted={noticeAccepted} />
      )}
    </div>
  );
}

// Company must never see a "Paused" status (client req 2026-07-08): mask the
// badge to Under Review. Display-only — the stored status is untouched.
function companyDisplayStatus(status: string) {
  return status === "on_hold" || status === "paused" ? "under_client_review" : status;
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
                  <StatusBadge status={companyDisplayStatus(candidate.status)} />
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
                  <span className="flex items-center gap-1">{t("components.recruiterJobsListPresentedLabel")} <span className="text-foreground font-medium">{new Date(candidate.recruito_screened_at).toLocaleDateString()}</span></span>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <ViewedIndicator viewed={!!candidate.company_viewed_at} label={t("components.candidateViewed")} />
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
