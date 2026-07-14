import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Briefcase, MapPin, Users, Plus, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { BonusBadge } from "@/components/shared/bonus-badge";
import { DraftRowActions } from "@/components/dashboard/recruiter/draft-row-actions";
import { DownloadJobDescription } from "@/components/dashboard/recruiter/download-job-description";
import { PresentationGenerator } from "@/components/screening/presentation-generator";
import { getRecruiterMandateById, getJobProcessStats } from "@/lib/actions/recruiter";
import { getJobAnnouncements } from "@/lib/actions/jobs";
import { createAdminClient } from "@/lib/supabase/admin";
import { JobPreviewCard } from "@/components/dashboard/shared/job-preview-card";
import { JobProcessStats } from "@/components/dashboard/shared/job-process-stats";
import { formatDate } from "@/lib/utils";
import { formatJobLocation } from "@/lib/format-job-location";
import { sanitizeRichText } from "@/lib/sanitize";
import { getDictionary } from "@/i18n/server";
import { EMPLOYMENT_TYPE_DICT_KEY } from "@/lib/job-form-options";
import { candidateInStage, isMandateStage, mandateExpiryDaysLeft, REFERRAL_BLOCKED_JOB_STATUSES, type MandateStage } from "@/lib/mandate-stages";
import { countCandidatesAgainstCap } from "@/lib/candidate-workflow";

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
    // Fetch the job and its company in two queries rather than a single
    // PostgREST embed. An embed (`company:companies(...)`) nulls the WHOLE row
    // if the relationship can't be resolved at runtime, which silently dropped
    // the recruiter back to the bare description fallback instead of the full
    // job detail. Splitting the query loads the job independently of the
    // company lookup, and we surface (not swallow) any error.
    const { data: jobData, error: jobError } = await adminClient
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    if (jobError) {
      console.error("[RecruiterMandate] full job fetch failed for job", jobId, jobError);
    }
    if (jobData) {
      let company: any = null;
      const companyId = (jobData as any).company_id;
      if (companyId) {
        const { data: companyData, error: companyError } = await adminClient
          .from("companies")
          .select("company_name, website, logo_url")
          .eq("id", companyId)
          .maybeSingle();
        if (companyError) {
          console.error("[RecruiterMandate] company fetch failed for job", jobId, companyError);
        }
        company = companyData ?? null;
      }
      fullJob = { ...jobData, company };
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

  // "Present candidate" gating — mirrors the mandates list view: a new candidate
  // can only be presented while the mandate is active, not expired, and below the
  // cap. Blocked-status check reuses REFERRAL_BLOCKED_JOB_STATUSES — the SAME set
  // the /candidates/new page 404s on (client-closed statuses PLUS "paused") — so
  // the button can never send a recruiter to a page that rejects them. Was: only
  // {closed,filled,cancelled}, which left the button live on a paused job and
  // produced the reported 404 on click. capReached counts JOB-WIDE occupied slots
  // via getJobProcessStats — the same number the admin badge and server gate use.
  const jobStats = jobId ? await getJobProcessStats(jobId) : null;
  const expiryDays = mandateExpiryDaysLeft({ claimedAt: mandate.claimed_at, candidates: mandate.candidates });
  const isExpired = expiryDays !== null && expiryDays <= 0;
  const cap = (mandate as any).max_candidates ?? 8;
  // Job-wide occupancy (all recruiters) — same number as the admin badge and
  // the server submission gate. Falls back to this recruiter's own rows only
  // if the stats fetch fails (button fail-open; the server gate still blocks).
  const capReached =
    (jobStats?.presented ?? countCandidatesAgainstCap(mandate.candidates.map((c) => c.status))) >= cap;
  const isBlockedStatus = REFERRAL_BLOCKED_JOB_STATUSES.has(mandate.status ?? "");
  const presentBlocked = isExpired || capReached || isBlockedStatus;
  const presentBlockedLabel = isExpired
    ? (r.expiredLabel || "Expired")
    : mandate.status === "paused"
      ? (r.pausedLabel || "Paused")
      : (r.capReachedLabel || "Cap reached");

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
            {fullJob?.final_interview_bonus && (
              <BonusBadge label={(r as any).finalInterviewBonus || "€100 Final Interview Bonus"} />
            )}
          </div>
          <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {mandate.company}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {formatJobLocation(mandate) || dict.common.notSpecified}</span>
            <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {mandate.employment_type ? (dict.employment as any)[EMPLOYMENT_TYPE_DICT_KEY[mandate.employment_type]] || mandate.employment_type : dict.common.notSpecified}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {jobId && <JobProcessStats jobId={jobId} preloaded={jobStats} />}

      <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
        <p className="text-sm text-amber-800">{r.confidentialNote}</p>
      </div>


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
                        <div className="flex items-center gap-3">
                          <Link href={`/recruiter/mandates/${mandate.id}/candidates/${candidate.id}`} className="text-brand-600 hover:text-brand-700 font-medium">
                            {r.openCandidate}
                          </Link>
                          <PresentationGenerator candidateId={candidate.id} candidateName={candidate.name} />
                        </div>
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
