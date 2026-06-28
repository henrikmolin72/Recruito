import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ArrowLeft, Download, Mail, Phone, Linkedin } from "lucide-react";
import { TabbedCandidateChat } from "@/components/shared/tabbed-candidate-chat";
import { getCandidateConversation } from "@/lib/actions/messages";
import { getDictionary } from "@/i18n/server";
import { CandidateDetailSections } from "@/components/shared/candidate-detail-sections";
import { SkillTagEditor } from "@/components/skills/skill-tag-editor";
import { CandidatePresentStatusPanel } from "@/components/dashboard/company/candidate-present-status-panel";
import { CandidateStageHistoryTimeline } from "@/components/dashboard/company/candidate-stage-history-timeline";
import type { CandidateStageHistory } from "@/types/db-types";

async function getCandidate(candidateId: string, jobId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: job } = await supabase
        .from("jobs")
        .select("company:companies(user_id)")
        .eq("id", jobId)
        .single();

    const companyData = job?.company;
    const jobOwnerId = Array.isArray(companyData) ? companyData[0]?.user_id : (companyData as any)?.user_id;
    if (jobOwnerId !== user.id) {
        console.error("Access denied: User is not job owner");
        return null;
    }

    const { data: candidate, error: candidateError } = await supabase
        .from("candidates")
        .select(`
      *,
      job:jobs(
        title,
        pipeline_stages
      ),
      recruiter:recruiters(
        headline,
        profile:profiles!recruiters_user_id_fkey(full_name)
      )
    `)
        .eq("id", candidateId)
        .single();

    if (candidateError) {
        console.error("Candidate fetch error:", candidateError);
    }

    // Visibility gate: a company cannot open a candidate Recruito hasn't approved.
    if (candidate && !(candidate as any).recruito_screened_at) {
        return null;
    }

    // profiles RLS only exposes a user's own row, so the recruiter.profile join
    // above returns null for the company and the name falls back to "Recruiter".
    // Ownership is already enforced, so read the name via the service-role client.
    if (candidate?.recruiter_id) {
        const { data: rec } = await createAdminClient()
            .from("recruiters")
            .select("profile:profiles!recruiters_user_id_fkey(full_name)")
            .eq("id", candidate.recruiter_id)
            .single();
        const profile = Array.isArray(rec?.profile) ? rec?.profile[0] : (rec?.profile as any);
        if (profile?.full_name) {
            (candidate as any).recruiter = { ...(candidate as any).recruiter, profile: { full_name: profile.full_name } };
        }
    }

    return candidate;
}

export default async function CandidateDetailsPage({ params }: { params: Promise<{ id: string, candidateId: string }> }) {
    const { id: jobId, candidateId } = await params;
    const candidate = await getCandidate(candidateId, jobId);

    if (!candidate) {
        notFound();
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const [conversation, recruitorConversation] = await Promise.all([
        getCandidateConversation(candidateId, 'client'),
        getCandidateConversation(candidateId, 'recruito_company'),
    ]);
    const initialMessages = (conversation as any)?.messages || [];
    const recruitorMessages = (recruitorConversation as any)?.messages || [];
    const dict = await getDictionary();
    const c = dict.company;

    let cvUrl = null;
    if (candidate.cv_file_path) {
        try {
            // Sign with the service-role client. Authorization is already enforced
            // above by getCandidate() (company must own the job), so CVs no longer
            // depend on a broad storage SELECT policy — see migration 054.
            const { data, error } = await createAdminClient().storage
                .from('cvs')
                .createSignedUrl(candidate.cv_file_path, 3600);

            if (!error) cvUrl = data?.signedUrl;
        } catch (e) {
            console.error("Storage error:", e);
        }
    }

    // Stage-progression audit trail (migration 052). RLS lets the owning company
    // read its own candidates' rows; most-recent-first for the timeline.
    const { data: stageHistoryRows } = await supabase
        .from("candidate_stage_history")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
    const stageHistory: CandidateStageHistory[] = (stageHistoryRows as CandidateStageHistory[]) ?? [];

    const stageNames: Record<string, string> = {
        viewed: c.stageNameViewed,
        interview: c.stageNameInterview,
        final_interview: c.stageNameFinalInterview,
        job_offer: c.stageNameJobOffer,
        hired: c.stageNameHired,
        rejected: c.stageNameRejected,
        withdrawn: c.stageNameWithdrawn,
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                    <Link href={`/company/jobs/${jobId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{candidate.first_name} {candidate.last_name}</h1>
                            <StatusBadge status={candidate.status} />
                        </div>
                        <p className="text-muted-foreground mt-1">
                            {c.presentedBy.replace("{name}", candidate.recruiter?.profile?.full_name || dict.common.recruiter)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {candidate.ai_match_score !== null && (
                        <div className="flex items-center gap-2">
                            <span className={`text-3xl font-black tabular-nums ${candidate.ai_match_score >= 80 ? "text-emerald-600" : candidate.ai_match_score >= 60 ? "text-amber-500" : "text-red-500"}`}>
                                {candidate.ai_match_score}%
                            </span>
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">AI Match</span>
                        </div>
                    )}
                    {cvUrl && (
                        <a href={cvUrl} target="_blank" rel="noreferrer">
                            <Button variant="outline" className="gap-2">
                                <Download className="h-4 w-4" /> {c.downloadCv}
                            </Button>
                        </a>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <CandidateDetailSections candidate={candidate} dict={dict} />
                </div>

                <div className="space-y-6">
                    {/* Present Status Panel */}
                    <CandidatePresentStatusPanel
                        candidateId={candidateId}
                        jobId={jobId}
                        initialStage={(candidate as any).company_stage ?? null}
                        initialOfferAccepted={candidate.status === 'offer_accepted'}
                        initialViewedAt={(candidate as any).company_viewed_at ?? null}
                        candidateStatus={candidate.status ?? null}
                        dict={{
                            closeJobTitle: c.closeJobTitle,
                            closeJobBody: c.closeJobBody,
                            closeJobYes: c.closeJobYes,
                            closeJobNo: c.closeJobNo,
                            closeJobDone: c.closeJobDone,
                            reopenCandidate: c.reopenCandidate,
                            reopenTitle: c.reopenTitle,
                            reopenTargetLabel: c.reopenTargetLabel,
                            reopenReasonLabel: c.reopenReasonLabel,
                            reopenReasonPlaceholder: c.reopenReasonPlaceholder,
                            reopenSubmit: c.reopenSubmit,
                            reopenCancel: c.reopenCancel,
                            stageNameInterview: c.stageNameInterview,
                            stageNameFinalInterview: c.stageNameFinalInterview,
                            stageNameJobOffer: c.stageNameJobOffer,
                            rejectButtonLabel: c.rejectButtonLabel,
                            stageNameRejected: c.stageNameRejected,
                        }}
                    />

                    {/* Stage history timeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{c.stageHistoryTitle}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CandidateStageHistoryTimeline
                                rows={stageHistory}
                                labels={{
                                    title: c.stageHistoryTitle,
                                    empty: c.stageHistoryEmpty,
                                    by: c.stageHistoryBy,
                                    reason: c.stageHistoryReason,
                                    actions: {
                                        move: c.stageActionMove,
                                        reject: c.stageActionReject,
                                        reopen: c.stageActionReopen,
                                        withdraw: c.stageActionWithdraw,
                                        hire: c.stageActionHire,
                                    },
                                    stageNames,
                                }}
                            />
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{c.contactInfoTitle}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a href={`mailto:${candidate.email}`} className="text-sm hover:underline">{candidate.email}</a>
                            </div>
                            {candidate.phone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{candidate.phone}</span>
                                </div>
                            )}
                            {candidate.linkedin_url && (
                                <div className="flex items-center gap-3">
                                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                                    <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">{dict.common.linkedInProfile}</a>
                                </div>
                            )}
                            {candidate.portfolio_url && (
                                <div className="flex items-center gap-3">
                                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                                    <a href={candidate.portfolio_url} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">Portfolio</a>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-5">
                            <SkillTagEditor candidateId={candidateId} readOnly />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="pt-6 border-t">
                <h2 className="text-xl font-bold mb-4">{c.candidateMessagesTitle}</h2>
                <TabbedCandidateChat
                    candidateId={candidateId}
                    jobId={jobId}
                    clientMessages={initialMessages}
                    recruitorMessages={recruitorMessages}
                    currentUserId={user?.id || ''}
                    candidate={candidate}
                    clientTabLabel={
                        candidate.recruiter?.profile?.full_name
                            ? `${(c as any).chatWithRecruiter || "Chat with Recruiter"} (${candidate.recruiter.profile.full_name})`
                            : ((c as any).chatWithRecruiter || "Chat with Recruiter")
                    }
                    recruitorConversationType="recruito_company"
                />
            </div>
        </div>
    );
}
