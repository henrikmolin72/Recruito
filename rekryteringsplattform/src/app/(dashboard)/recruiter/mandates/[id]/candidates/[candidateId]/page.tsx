import type { PipelineStage } from "@/types/db-types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
    ArrowLeft,
    Mail,
    Phone,
    Linkedin,
    FileText,
    GitBranch,
    Search,
    MessageSquare,
    ClipboardCheck,
    Inbox,
    Award,
    CheckCircle2,
    Circle,
    PauseCircle,
    Sparkles,
} from "lucide-react";
import { TabbedCandidateChat } from "@/components/shared/tabbed-candidate-chat";
import { CompanyNextStepPanel } from "@/components/dashboard/recruiter/company-next-step-panel";
import { RecruiterWithdrawControl } from "@/components/dashboard/recruiter/recruiter-withdraw-control";
import { getCandidateConversation } from "@/lib/actions/messages";
import { getDictionary } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { SkillTagEditor } from "@/components/skills/skill-tag-editor";
import { EvaluationPromptPanel } from "@/components/screening/evaluation-prompt-panel";
import { getMandateEvalConfig, getLatestEvaluation } from "@/lib/actions/screening";

type CandidatePipelineNode = {
    id: string;
    label: string;
    kind: "submitted" | "reviewing" | "interview" | "custom" | "offered" | "decision" | "paused";
    stageType?: PipelineStage["type"];
    description?: string | null;
};

function getJobPipelineStages(candidate: any): PipelineStage[] {
    const rawStages = (candidate.job as any)?.pipeline_stages;
    if (!Array.isArray(rawStages)) return [];
    return [...(rawStages as PipelineStage[])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function buildCandidatePipelineNodes(candidate: any, dict: any): CandidatePipelineNode[] {
    const stages = getJobPipelineStages(candidate);
    const components = (dict as any).components || {};

    const submittedLabel = stages.length > 0
        ? (components.kanbanNewReviewing || "Nya / Granskas")
        : (components.pipelineSubmitted || "Inskickad");
    const reviewingLabel = components.pipelineUnderReview || "Under granskning";
    const interviewLabel = components.pipelineInterview || "Intervju";
    const offerLabel = components.kanbanOffer || components.pipelineOffer || "Erbjudande";
    const decisionLabel = components.kanbanDecision || "Beslut";
    const pausedLabel = components.kanbanPaused || "Pausad";

    if (stages.length > 0) {
        return [
            { id: "__submitted", label: submittedLabel, kind: "submitted" },
            ...stages.map((stage) => ({
                id: stage.id,
                label: stage.title,
                kind: "custom" as const,
                stageType: stage.type,
                description: stage.description,
            })),
            { id: "__offered", label: offerLabel, kind: "offered" },
            { id: "__decision", label: decisionLabel, kind: "decision" },
            { id: "__paused", label: pausedLabel, kind: "paused" },
        ];
    }

    return [
        { id: "__submitted", label: submittedLabel, kind: "submitted" },
        { id: "__reviewing", label: reviewingLabel, kind: "reviewing" },
        { id: "__interview", label: interviewLabel, kind: "interview" },
        { id: "__offered", label: offerLabel, kind: "offered" },
        { id: "__decision", label: decisionLabel, kind: "decision" },
        { id: "__paused", label: pausedLabel, kind: "paused" },
    ];
}

function getCandidateActivePipelineNodeId(candidate: any, nodes: CandidatePipelineNode[]): string {
    const stages = getJobPipelineStages(candidate);

    if (candidate.status === "paused") return "__paused";
    if (candidate.status === "hired" || candidate.status === "completed" || candidate.status === "rejected" || candidate.status === "declined") {
        return "__decision";
    }
    if (candidate.status === "offered") return "__offered";
    if (candidate.current_pipeline_stage && nodes.some((node) => node.id === candidate.current_pipeline_stage)) {
        return candidate.current_pipeline_stage;
    }

    if (stages.length === 0) {
        if (candidate.status === "interview") return "__interview";
        if (candidate.status === "reviewing" || candidate.status === "rejected") return "__reviewing";
        return "__submitted";
    }

    if (candidate.status === "interview") {
        const interviewStage = stages.find((stage) => stage.type === "interview");
        if (interviewStage) return interviewStage.id;
        return stages[Math.min(1, stages.length - 1)]?.id || stages[0].id;
    }

    if ((candidate.status === "reviewing" || candidate.status === "rejected") && stages[0]) {
        return stages[0].id;
    }

    return "__submitted";
}

function getPipelineNodeIcon(node: CandidatePipelineNode) {
    if (node.kind === "custom") {
        switch (node.stageType) {
            case "screening":
                return <Search className="h-4 w-4" />;
            case "interview":
                return <MessageSquare className="h-4 w-4" />;
            case "test":
            case "assessment":
                return <ClipboardCheck className="h-4 w-4" />;
            default:
                return <Sparkles className="h-4 w-4" />;
        }
    }

    switch (node.kind) {
        case "submitted":
            return <Inbox className="h-4 w-4" />;
        case "reviewing":
            return <Search className="h-4 w-4" />;
        case "interview":
            return <MessageSquare className="h-4 w-4" />;
        case "offered":
            return <Award className="h-4 w-4" />;
        case "decision":
            return <CheckCircle2 className="h-4 w-4" />;
        case "paused":
            return <PauseCircle className="h-4 w-4" />;
        default:
            return <Circle className="h-4 w-4" />;
    }
}

function RecruiterCandidateProcessCard({ candidate, dict }: { candidate: any; dict: any }) {
    const nodes = buildCandidatePipelineNodes(candidate, dict);
    const activeNodeId = getCandidateActivePipelineNodeId(candidate, nodes);
    const activeIndex = Math.max(nodes.findIndex((node) => node.id === activeNodeId), 0);
    const activeNode = nodes[activeIndex] || nodes[0];
    const isNegativeTerminal = candidate.status === "rejected" || candidate.status === "declined";

    return (
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <GitBranch className="h-3.5 w-3.5" />
                            {(dict.recruiter as any).hiringProcess || "Rekryteringsprocess"}
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-900 truncate">
                            {activeNode?.label}
                        </p>
                        {activeNode?.description && (
                            <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">
                                {activeNode.description}
                            </p>
                        )}
                    </div>
                    <StatusBadge status={candidate.status} />
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                <div
                    className="overflow-x-auto pb-3 pr-1
                    [&::-webkit-scrollbar]:h-2
                    [&::-webkit-scrollbar-track]:rounded-full
                    [&::-webkit-scrollbar-track]:bg-slate-100
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    [&::-webkit-scrollbar-thumb]:bg-slate-300
                    hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"
                >
                    <div className="flex items-start gap-2 min-w-max py-1">
                        {nodes.map((node, index) => {
                            const isComplete = index < activeIndex;
                            const isActive = index === activeIndex;
                            const isFuture = index > activeIndex;

                            const connectorDone = index < activeIndex;
                            const connectorTone = isNegativeTerminal && connectorDone ? "bg-rose-200" : connectorDone ? "bg-brand-300" : "bg-slate-200";

                            return (
                                <div key={node.id} className="flex items-start gap-2">
                                    <div
                                        className={cn(
                                            "w-[128px] sm:w-[136px] rounded-2xl border p-3 transition-colors relative",
                                            isComplete && "border-brand-200 bg-brand-50/70 text-brand-700",
                                            isActive && !isNegativeTerminal && "border-brand-300 bg-white text-slate-900 shadow-lg shadow-brand-100/60 ring-2 ring-brand-100",
                                            isActive && isNegativeTerminal && "border-rose-300 bg-rose-50 text-rose-700 shadow-sm",
                                            isFuture && "border-slate-200 bg-slate-50/80 text-slate-400"
                                        )}
                                    >
                                        <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-300">
                                            {index + 1}
                                        </span>

                                        <div
                                            className={cn(
                                                "h-8 w-8 rounded-xl border flex items-center justify-center",
                                                isComplete && "bg-brand-600 border-brand-600 text-white",
                                                isActive && !isNegativeTerminal && "bg-brand-50 border-brand-200 text-brand-700",
                                                isActive && isNegativeTerminal && "bg-rose-100 border-rose-200 text-rose-700",
                                                isFuture && "bg-white border-slate-200 text-slate-300"
                                            )}
                                        >
                                            {isComplete ? <CheckCircle2 className="h-4 w-4" /> : getPipelineNodeIcon(node)}
                                        </div>

                                        <p className={cn(
                                            "mt-3 text-xs font-bold leading-tight min-h-[2rem]",
                                            isFuture ? "text-slate-400" : "text-current"
                                        )}>
                                            {node.label}
                                        </p>

                                        <div className="mt-2 h-1.5 w-full rounded-full bg-white/70 border border-white/60 overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full transition-all",
                                                    isComplete && (isNegativeTerminal ? "bg-rose-300" : "bg-brand-400"),
                                                    isActive && (isNegativeTerminal ? "bg-rose-400 w-2/3" : "bg-brand-500 w-2/3"),
                                                    isFuture && "w-0 bg-transparent"
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {index < nodes.length - 1 && (
                                        <div className="pt-8 w-8 sm:w-10 flex items-center">
                                            <div className={cn("h-1.5 w-full rounded-full", connectorTone)} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

async function getCandidate(candidateId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <RecruiterCandidateProcessCard candidate={candidate} dict={dict} />

                    <RecruiterWithdrawControl
                        candidateId={candidateId}
                        jobId={candidate.job_id}
                        dict={r as any}
                    />

                    <CompanyNextStepPanel
                        candidateId={candidateId}
                        jobId={candidate.job_id}
                        candidateStatus={candidate.status}
                        pendingRequest={candidate.company_requested_next_step}
                        pendingRequestNote={candidate.company_requested_next_step_note}
                        pendingRequestAt={candidate.company_requested_next_step_at}
                        pipelineStages={(candidate.job as any)?.pipeline_stages || []}
                    />

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
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{r.profileOverview}</h3>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                        <Mail className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{candidate.email}</span>
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
                            </div>

                            <div className="pt-4 border-t border-slate-50 space-y-4">
                                {candidate.desired_salary && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{r.salaryExpectationLabel}</p>
                                        <p className="text-sm font-bold text-slate-700">
                                            {candidate.desired_salary_currency || ''} {candidate.desired_salary?.toLocaleString()}
                                        </p>
                                        {candidate.expected_salary_below_current_reason && (
                                            <p className="mt-1 text-xs text-slate-500 italic">
                                                {candidate.expected_salary_below_current_reason}
                                            </p>
                                        )}
                                    </div>
                                )}
                                {(candidate.location_city || candidate.location_country) && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                                        <p className="text-sm font-bold text-slate-700">
                                            {[candidate.location_city, candidate.location_country].filter(Boolean).join(", ")}
                                        </p>
                                    </div>
                                )}
                                {candidate.work_authorization && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Work Authorization</p>
                                        <p className="text-sm font-bold text-slate-700 capitalize">{candidate.work_authorization.replace(/_/g, ' ')}</p>
                                    </div>
                                )}
                                {candidate.employment_status && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Employment Status</p>
                                        <p className="text-sm font-bold text-slate-700 capitalize">{candidate.employment_status.replace(/_/g, ' ')}</p>
                                    </div>
                                )}
                                {candidate.notice_period && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notice Period</p>
                                        <p className="text-sm font-bold text-slate-700">
                                            {candidate.notice_period === 'immediately' ? 'Available Immediately' : candidate.notice_period.replace(/_/g, ' ')}
                                            {candidate.notice_negotiable && <span className="ml-2 text-xs text-emerald-600">(Negotiable)</span>}
                                        </p>
                                    </div>
                                )}
                                {candidate.other_processes !== null && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Other Processes</p>
                                        <p className="text-sm font-bold text-slate-700">
                                            {candidate.other_processes
                                                ? `Yes${candidate.other_processes_stage ? ` — ${candidate.other_processes_stage.replace(/_/g, ' ')}` : ''}`
                                                : 'No'}
                                        </p>
                                    </div>
                                )}
                                {candidate.contact_method && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Preferred Contact</p>
                                        <p className="text-sm font-bold text-slate-700 capitalize">{candidate.contact_method.replace(/_/g, ' ')}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
                        <CardContent className="p-6">
                            <SkillTagEditor candidateId={candidate.id} />
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-slate-900 text-white overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <FileText className="h-5 w-5 text-brand-400" />
                                <h3 className="font-bold">{r.yourMotivation}</h3>
                            </div>
                            <p className="text-sm text-slate-400 italic leading-relaxed">
                                &quot;{candidate.cover_note || dict.company.noMotivationProvided}&quot;
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
