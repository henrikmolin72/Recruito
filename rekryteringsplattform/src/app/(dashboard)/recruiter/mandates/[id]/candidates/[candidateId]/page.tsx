import type { CandidateStageHistory } from "@/types/db-types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
    ArrowLeft,
    Mail,
    Phone,
    Linkedin,
    Download,
} from "lucide-react";
import { TabbedCandidateChat } from "@/components/shared/tabbed-candidate-chat";
import { CompanyNextStepPanel } from "@/components/dashboard/recruiter/company-next-step-panel";
import { CandidateDetailSections } from "@/components/shared/candidate-detail-sections";
import { CandidateStageHistoryTimeline } from "@/components/dashboard/company/candidate-stage-history-timeline";
import { getCandidateConversation } from "@/lib/actions/messages";
import { getDictionary } from "@/i18n/server";
import { SkillTagEditor } from "@/components/skills/skill-tag-editor";
import { EvaluationPromptPanel } from "@/components/screening/evaluation-prompt-panel";
import { getMandateEvalConfig, getLatestEvaluation } from "@/lib/actions/screening";

async function getCandidate(candidateId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id")
        .eq("user_id", user.id)
        .single();
    if (!recruiter) return null;

    const { data: candidate } = await supabase
        .from("candidates")
        .select(`
            *,
            job:jobs(
                title,
                pipeline_stages,
                company:companies(company_name)
            )
        `)
        .eq("id", candidateId)
        .single();

    // IDOR guard: a recruiter may only open candidates they presented. The CV is
    // signed below with the service-role client (which bypasses RLS), so an
    // explicit ownership check is required here — not just RLS on the read above.
    if (!candidate || (candidate as any).recruiter_id !== recruiter.id) return null;

    return candidate;
}

export default async function RecruiterCandidateDetailsPage({ params }: { params: Promise<{ id: string, candidateId: string }> }) {
    const { id: mandateId, candidateId } = await params;
    const candidate = await getCandidate(candidateId);

    if (!candidate) {
        notFound();
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const [conversation, recruitorConversation] = await Promise.all([
        getCandidateConversation(candidateId, 'client'),
        getCandidateConversation(candidateId, 'recruito_recruiter'),
    ]);
    const initialMessages = (conversation as any)?.messages || [];
    const recruitorMessages = (recruitorConversation as any)?.messages || [];
    const dict = await getDictionary();
    const r = dict.recruiter;
    const [evalConfig, latestEvaluation] = await Promise.all([
        getMandateEvalConfig(mandateId),
        getLatestEvaluation(candidateId, mandateId),
    ]);

    // CV + stage history are read with the service-role client only AFTER
    // getCandidate() confirmed this recruiter owns the candidate (IDOR guard),
    // mirroring how the company/admin pages sign CVs without relying on a broad
    // storage SELECT policy (see migration 054).
    const admin = createAdminClient();
    let cvUrl: string | null = null;
    if (candidate.cv_file_path) {
        try {
            const { data, error } = await admin.storage.from("cvs").createSignedUrl(candidate.cv_file_path, 3600);
            if (!error) cvUrl = data?.signedUrl ?? null;
        } catch (e) {
            console.error("Storage error:", e);
        }
    }
    const { data: stageHistoryRows } = await admin
        .from("candidate_stage_history")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
    const stageHistory: CandidateStageHistory[] = (stageHistoryRows as CandidateStageHistory[]) ?? [];
    // Reuse the client-side labels so the recruiter sees the same stage history UI.
    const cc = dict.company;
    const stageNames: Record<string, string> = {
        viewed: cc.stageNameViewed,
        interview: cc.stageNameInterview,
        final_interview: cc.stageNameFinalInterview,
        job_offer: cc.stageNameJobOffer,
        hired: cc.stageNameHired,
        rejected: cc.stageNameRejected,
        withdrawn: cc.stageNameWithdrawn,
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto py-2">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between border-b pb-8 border-slate-100">
                <div className="flex items-start gap-5">
                    <Link href="/recruiter/mandates">
                        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-slate-100">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">
                                {candidate.first_name} {candidate.last_name}
                            </h1>
                            <StatusBadge status={candidate.status} />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                            <span className="text-slate-400">{r.assignmentLabel}</span>
                            <span className="text-brand-600 font-bold">{candidate.job?.title || dict.common.unknownJob}</span>
                            <span className="text-slate-300">•</span>
                            <span>{(candidate.job?.company as any)?.company_name || dict.common.unknownCompany}</span>
                        </div>
                    </div>
                </div>
                {cvUrl && (
                    <a href={cvUrl} target="_blank" rel="noreferrer">
                        <Button variant="outline" className="gap-2">
                            <Download className="h-4 w-4" /> {dict.company.downloadCv}
                        </Button>
                    </a>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <CompanyNextStepPanel
                        candidateId={candidateId}
                        jobId={candidate.job_id}
                        candidateStatus={candidate.status}
                        pendingRequest={candidate.company_requested_next_step}
                        pendingRequestNote={candidate.company_requested_next_step_note}
                        pendingRequestAt={candidate.company_requested_next_step_at}
                        pipelineStages={(candidate.job as any)?.pipeline_stages || []}
                    />

                    <CandidateDetailSections candidate={candidate} dict={dict} />

                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
                            {r.candidateDetailDiscussionTitle}
                        </h3>
                        <TabbedCandidateChat
                            candidateId={candidateId}
                            jobId={candidate.job_id}
                            clientMessages={initialMessages}
                            recruitorMessages={recruitorMessages}
                            currentUserId={user?.id || ''}
                            candidate={candidate}
                            clientTabLabel="Chat with Client"
                            recruitorConversationType="recruito_recruiter"
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <EvaluationPromptPanel
                        candidateId={candidateId}
                        mandateId={mandateId}
                        initialConfig={evalConfig}
                        initialReport={latestEvaluation}
                        dict={r as any}
                    />

                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
                        <CardHeader className="pb-2">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.company.contactInfoTitle}</h3>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                </div>
                                <a href={`mailto:${candidate.email}`} className="text-sm font-bold text-slate-700 hover:underline">{candidate.email}</a>
                            </div>
                            {candidate.phone && (
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                        <Phone className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{candidate.phone}</span>
                                </div>
                            )}
                            {candidate.linkedin_url && (
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                        <Linkedin className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-brand-600 hover:underline">{dict.common.linkedInProfile}</a>
                                </div>
                            )}
                            {candidate.portfolio_url && (
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                        <Linkedin className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <a href={candidate.portfolio_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-brand-600 hover:underline">Portfolio</a>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{dict.company.stageHistoryTitle}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CandidateStageHistoryTimeline
                                rows={stageHistory}
                                labels={{
                                    title: cc.stageHistoryTitle,
                                    empty: cc.stageHistoryEmpty,
                                    by: cc.stageHistoryBy,
                                    reason: cc.stageHistoryReason,
                                    actions: {
                                        move: cc.stageActionMove,
                                        reject: cc.stageActionReject,
                                        reopen: cc.stageActionReopen,
                                        withdraw: cc.stageActionWithdraw,
                                        hire: cc.stageActionHire,
                                    },
                                    stageNames,
                                }}
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
                        <CardContent className="p-6">
                            <SkillTagEditor candidateId={candidate.id} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
