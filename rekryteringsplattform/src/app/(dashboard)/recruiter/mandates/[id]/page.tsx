import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Briefcase, MapPin, Users, Plus, GitBranch, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DraftRowActions } from "@/components/dashboard/recruiter/draft-row-actions";
import { DownloadJobDescription } from "@/components/dashboard/recruiter/download-job-description";
import { PipelineFlowchart } from "@/components/dashboard/recruiter/pipeline-flowchart";
import { ShortlistGenerator } from "@/components/screening/shortlist-generator";
import { getRecruiterMandateById } from "@/lib/actions/recruiter";
import { getJobAnnouncements } from "@/lib/actions/jobs";
import { createAdminClient } from "@/lib/supabase/admin";
import { JobPreviewCard } from "@/components/dashboard/shared/job-preview-card";
import { formatCurrency, formatDate, calculateClientFee } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/sanitize";
import { getDictionary } from "@/i18n/server";
import { EMPLOYMENT_TYPE_DICT_KEY } from "@/lib/job-form-options";
import { candidateInStage, isMandateStage, mandateExpiryDaysLeft, type MandateStage } from "@/lib/mandate-stages";

const STAGE_LABEL_KEY: Record<MandateStage, string> = {
  draft: "colDraft",
  in_review: "colInReview",
  submitted: "colSubmitted",
  interview: "colInInterview",
  final_interview: "colFinalInterview",
  offer: "colJobOffer",
  hired: "colHired",
  rejected: "colRejected",
  withdrawn: "colWithdrawn",
};

export default async function RecruiterMandateDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stage?: string }>;
}) {
  const { id } = await params;
  const { stage } = await searchParams;
  const mandate = await getRecruiterMandateById(id);

  if (!mandate) {
    notFound();
  }

  // Source the job id from whatever the action actually exposes. The select
  // nests the job as `job:jobs(...)`, so depending on the mapping the id may
  // surface as a top-level `job_id` or as `job.id` — fall back so the
  // JobPreviewCard fetch below never silently no-ops.
  const jobId: string | undefined = (mandate as any).job_id ?? (mandate as any).job?.id;

  const announcements = jobId ? await getJobAnnouncements(jobId) : [];

  // Full job row with every client-filled form field. Mandate ownership is
  // already verified by getRecruiterMandateById; the admin client bypasses
  // RLS that would otherwise hide job columns from the recruiter.
  let fullJob: any = null;
  if (jobId) {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("jobs")
      .select("*, company:companies(company_name, website, logo_url, linkedin_url)")
      .eq("id", jobId)
      .maybeSingle();
    if (data) {
      fullJob = { ...data, company: Array.isArray(data.company) ? data.company[0] ?? null : data.company };
    }
  }

  const dict = await getDictionary();
  const r = dict.recruiter;

  // Optional stage filter, deep-linked from the count badges on the mandates list.
  const activeStage: MandateStage | null = isMandateStage(stage) ? stage : null;
  const visibleCandidates = activeStage
    ? mandate.candidates.filter((c) => candidateInStage(c, activeStage))
    : mandate.candidates;
  const activeStageLabel = activeStage ? ((r as any)[STAGE_LABEL_KEY[activeStage]] || activeStage) : null;

  // "Present candidate" gating — mirrors the mandates list view: a new
  // candidate can only be presented while the mandate is active, not expired,
  // and below the submission cap.
  const expiryDays = mandateExpiryDaysLeft({ claimedAt: mandate.claimed_at, candidates: mandate.candidates });
  const isExpired = expiryDays !== null && expiryDays <= 0;
  const cap = (mandate as any).max_candidates ?? 8;
  const capReached = mandate.candidates.length >= cap;
  const isInactive = new Set(["closed", "filled", "cancelled"]).has(mandate.status ?? "");
  const presentBlocked = isExpired || capReached || isInactive;
  const presentBlockedLabel = isExpired ? (r.expiredLabel || "Expired") : (r.capReachedLabel || "Cap reached");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href="/recruiter/mandates" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {r.backToMandates}
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{mandate.title}</h1>
            <StatusBadge status={mandate.status} />
          </div>
          <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {mandate.company}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {mandate.location || dict.common.notSpecified}</span>
            <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {mandate.employment_type ? (dict.employment as any)[EMPLOYMENT_TYPE_DICT_KEY[mandate.employment_type]] || mandate.employment_type : dict.common.notSpecified}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {jobId ? <ShortlistGenerator jobId={jobId} /> : null}
          <DownloadJobDescription mandate={mandate} />
          {presentBlocked ? (
            <Button size="sm" disabled className="bg-success-500 gap-1 opacity-60 cursor-not-allowed">
              <Plus className="h-4 w-4" /> {presentBlockedLabel}
            </Button>
          ) : (
            <Link href={`/recruiter/mandates/${mandate.id}/candidates/new`}>
              <Button size="sm" className="bg-success-500 hover:bg-success-700 gap-1">
                <Plus className="h-4 w-4" /> {r.presentCandidate}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
        <p className="text-sm text-amber-800">{r.confidentialNote}</p>
      </div>

      <Card>
        <CardContent className="p-6 grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{r.industryLabel}</p>
            <p className="mt-1 text-sm">{mandate.industry || dict.common.notSpecified}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{r.feeLabel}</p>
            <p className="mt-1 text-sm">
              {mandate.client_fee_amount != null
                ? formatCurrency(Number(mandate.client_fee_amount), mandate.salary_currency || "EUR")
                : (mandate.salary_max || mandate.salary_min)
                  ? formatCurrency(calculateClientFee(mandate.salary_max || mandate.salary_min, mandate.guarantee_period_months ?? 0, !!mandate.is_exclusive), mandate.salary_currency || "EUR")
                  : mandate.fee_percentage ? `${mandate.fee_percentage}%` : dict.common.notSpecifiedNeutral}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{r.salaryRange}</p>
            <p className="mt-1 text-sm">
              {(mandate.salary_max || mandate.salary_min)
                ? `${formatCurrency(mandate.salary_max || mandate.salary_min)} ${mandate.salary_currency || "EUR"}`
                : dict.common.notSpecifiedNeutral}
            </p>
          </div>
        </CardContent>
      </Card>

      {announcements.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Megaphone className="h-3.5 w-3.5" /> Client Announcements
            </p>
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                <p className="text-sm whitespace-pre-wrap">{a.message}</p>
                <p className="text-[10px] text-muted-foreground mt-2">{formatDate(a.created_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {fullJob && <JobPreviewCard job={fullJob} variant="recruiter" showMandateCta={false} shiftWorkLabel={(r as any).shiftWork || "Shift Work"} />}

      {!fullJob && (
      <Card>
        <CardContent className="p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{r.roleDescription}</p>
          {mandate.description ? (
            <div className="prose max-w-none text-sm text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeRichText(mandate.description) }} />
          ) : (
            <p className="text-sm text-muted-foreground">{r.noDescriptionAvailable}</p>
          )}
        </CardContent>
      </Card>
      )}

      {mandate.pipeline_stages && mandate.pipeline_stages.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <GitBranch className="h-3.5 w-3.5" /> {(r as any).hiringProcess || "Rekryteringsprocess"}
            </p>
            <PipelineFlowchart
              stages={mandate.pipeline_stages}
              candidates={mandate.candidates}
            />
          </CardContent>
        </Card>
      )}

      <Card id="candidates" className="scroll-mt-6">
        <CardContent className="p-0 overflow-x-auto">
          <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold inline-flex items-center gap-2"><Users className="h-4 w-4" /> {r.candidatesHeader.replace("{count}", String(visibleCandidates.length))}</h2>
            {activeStage && (
              <div className="inline-flex items-center gap-2 text-xs">
                <span className="inline-flex items-center rounded-full bg-brand-50 text-brand-700 px-3 py-1 font-medium">{activeStageLabel}</span>
                <Link href={`/recruiter/mandates/${mandate.id}`} className="text-muted-foreground hover:text-foreground font-medium">
                  {dict.common.clearFilters}
                </Link>
              </div>
            )}
          </div>

          {visibleCandidates.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{r.noCandidatesPresentedTable}</div>
          ) : (
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="p-4 font-medium text-muted-foreground">{r.tableNameHeader}</th>
                  <th className="p-4 font-medium text-muted-foreground">{r.tableStatusHeader}</th>
                  <th className="p-4 font-medium text-muted-foreground">{r.tableSentHeader}</th>
                  <th className="p-4 font-medium text-muted-foreground">{r.tableActionHeader}</th>
                </tr>
              </thead>
              <tbody>
                {visibleCandidates.map((candidate) => (
                  <tr key={candidate.id} className="border-b border-border last:border-0">
                    <td className="p-4 font-medium">{candidate.name || "Namnlöst utkast"}</td>
                    <td className="p-4"><StatusBadge status={candidate.status} /></td>
                    <td className="p-4 text-muted-foreground">{formatDate(candidate.created_at)}</td>
                    <td className="p-4">
                      {candidate.status === "draft" ? (
                        <DraftRowActions
                          mandateId={mandate.id}
                          draftId={candidate.id}
                          resumeLabel={(r as any).resume || "Återuppta"}
                          deleteLabel={(r as any).remove || "Ta bort"}
                          confirmLabel={(r as any).removeDraftConfirm || "Ta bort detta utkast?"}
                        />
                      ) : (
                        <Link href={`/recruiter/mandates/${mandate.id}/candidates/${candidate.id}`} className="text-brand-600 hover:text-brand-700 font-medium">
                          {r.openCandidate}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
