import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Briefcase, MapPin, Users, Plus, GitBranch, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { DownloadJobDescription } from "@/components/dashboard/recruiter/download-job-description";
import { PipelineFlowchart } from "@/components/dashboard/recruiter/pipeline-flowchart";
import { PublicApplicationLinkCard } from "@/components/dashboard/recruiter/public-application-link-card";
import { ApplicationReviewActions } from "@/components/dashboard/recruiter/application-review-actions";
import { ShortlistGenerator } from "@/components/screening/shortlist-generator";
import { CandidateScoreCard } from "@/components/screening/candidate-score-card";
import { getRecruiterMandateById, getRecruiterApplicationsForJob } from "@/lib/actions/recruiter";
import { getAppUrl } from "@/lib/app-url";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getDictionary } from "@/i18n/server";
import { EMPLOYMENT_TYPE_DICT_KEY } from "@/lib/job-form-options";

const MAX_SUBMISSIONS = 7;

export default async function RecruiterMandateDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mandate = await getRecruiterMandateById(id);

  if (!mandate) {
    notFound();
  }

  const applications = mandate.job_id ? await getRecruiterApplicationsForJob(mandate.job_id) : [];
  const appUrl = await getAppUrl();
  const publicApplicationLink = `${appUrl}/apply/${mandate.id}`;

  const submittedToClientCount = applications.filter(
    (app: any) => app.status === "submitted_to_client"
  ).length;
  const remainingSlots = MAX_SUBMISSIONS - submittedToClientCount;

  const dict = await getDictionary();
  const r = dict.recruiter;

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
          {mandate.job_id ? <ShortlistGenerator jobId={mandate.job_id} /> : null}
          <DownloadJobDescription mandate={mandate} />
          <Link href={`/recruiter/mandates/${mandate.id}/candidates/new`}>
            <Button size="sm" className="bg-success-500 hover:bg-success-700 gap-1">
              <Plus className="h-4 w-4" /> {r.presentCandidate}
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{r.industryLabel}</p>
            <p className="mt-1 text-sm">{mandate.industry || dict.common.notSpecified}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{r.feeLabel}</p>
            <p className="mt-1 text-sm">{mandate.fee_percentage ? `${mandate.fee_percentage}%` : dict.common.notSpecifiedNeutral}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{r.salaryRange}</p>
            <p className="mt-1 text-sm">
              {mandate.salary_min
                ? `${formatCurrency(mandate.salary_min)}${mandate.salary_max ? ` - ${formatCurrency(mandate.salary_max)}` : ""}`
                : dict.common.notSpecifiedNeutral}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{r.roleDescription}</p>
          <p className="text-sm whitespace-pre-wrap">{mandate.description || r.noDescriptionAvailable}</p>
        </CardContent>
      </Card>

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

      <PublicApplicationLinkCard
        url={publicApplicationLink}
        submittedCount={submittedToClientCount}
        maxSubmissions={MAX_SUBMISSIONS}
      />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold inline-flex items-center gap-2"><Users className="h-4 w-4" /> {r.candidatesHeader.replace("{count}", String(mandate.candidates.length))}</h2>
          </div>

          {mandate.candidates.length === 0 ? (
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
                {mandate.candidates.map((candidate) => (
                  <tr key={candidate.id} className="border-b border-border last:border-0">
                    <td className="p-4 font-medium">{candidate.name}</td>
                    <td className="p-4"><StatusBadge status={candidate.status} /></td>
                    <td className="p-4 text-muted-foreground">{formatDate(candidate.created_at)}</td>
                    <td className="p-4">
                      <Link href={`/recruiter/mandates/${mandate.id}/candidates/${candidate.id}`} className="text-brand-600 hover:text-brand-700 font-medium">
                        {r.openCandidate}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Referral link applications — Review & Submit to Client */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Inbox className="h-3.5 w-3.5" /> Kandidater via referenslänk
              </p>
              <h2 className="text-lg font-semibold">Granska och skicka till kund</h2>
              <p className="text-sm text-muted-foreground">
                Kandidater som ansökt via din referenslänk. Granska och välj vilka som ska skickas vidare till kunden.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{applications.length} ansökningar</Badge>
              <Badge variant={remainingSlots > 0 ? "success" : "danger"}>
                {submittedToClientCount}/{MAX_SUBMISSIONS} skickade
              </Badge>
            </div>
          </div>

          {applications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground text-center">
              Inga ansökningar har inkommit via referenslänken ännu. Dela länken ovan med kandidater som matchar rollen.
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application: any) => (
                <div key={application.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                    <div className="lg:w-[320px] shrink-0">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 h-full">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold text-slate-900 leading-tight">{application.full_name || "Okänd kandidat"}</h3>
                          <Badge variant="outline">{application.status || "new"}</Badge>
                        </div>
                        <div className="mt-3 space-y-2 text-sm">
                          <p className="text-slate-600">
                            <span className="font-medium text-slate-900">E-post:</span> {application.email || "\u2014"}
                          </p>
                          {application.phone ? (
                            <p className="text-slate-600">
                              <span className="font-medium text-slate-900">Telefon:</span> {application.phone}
                            </p>
                          ) : null}
                          {application.linkedin_url ? (
                            <p className="text-slate-600">
                              <span className="font-medium text-slate-900">LinkedIn:</span>{" "}
                              <a href={application.linkedin_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline truncate">
                                Profil
                              </a>
                            </p>
                          ) : null}
                          <p className="text-slate-600">
                            <span className="font-medium text-slate-900">Skickad:</span> {formatDate(application.created_at)}
                          </p>
                          {application.screening?.screened_at ? (
                            <p className="text-xs text-brand-700 font-medium">
                              Senast screenad: {formatDate(application.screening.screened_at)}
                            </p>
                          ) : null}
                        </div>

                        {/* Screening answers */}
                        {application.screening_answers && Object.keys(application.screening_answers).length > 0 ? (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Screeningsvar</p>
                            {Object.entries(application.screening_answers).map(([key, answer]) => (
                              <div key={key} className="mb-2">
                                <p className="text-xs text-slate-500">Fråga {Number(key) + 1}</p>
                                <p className="text-xs text-slate-700">{String(answer)}</p>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {/* Review actions */}
                        <div className="mt-4 pt-3 border-t border-slate-200">
                          <ApplicationReviewActions
                            applicationId={application.id}
                            status={application.status}
                            remainingSlots={remainingSlots}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <CandidateScoreCard
                        applicationId={application.id}
                        candidateName={application.full_name || undefined}
                        initialResult={
                          application.screening
                            ? {
                                score: application.screening.score || 0,
                                reasoning: application.screening.reasoning || [],
                                missingSkills: application.screening.missingSkills || [],
                              }
                            : null
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
