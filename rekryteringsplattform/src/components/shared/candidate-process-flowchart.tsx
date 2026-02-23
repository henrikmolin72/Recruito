import type { PipelineStage } from "@/types/db-types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { normalizeCandidateStatusForWorkflow } from "@/lib/candidate-workflow";
import {
    Award,
    CheckCircle2,
    Circle,
    ClipboardCheck,
    GitBranch,
    Inbox,
    MessageSquare,
    PauseCircle,
    Search,
    Sparkles,
} from "lucide-react";

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
    const normalizedStatus = normalizeCandidateStatusForWorkflow(candidate.status);

    if (normalizedStatus === "on_hold" || candidate.status === "paused") return "__paused";
    if (
        [
            "hired",
            "completed",
            "rejected",
            "declined",
            "duplicate_rejected",
            "client_already_engaged",
            "rejected_client",
            "rejected_interview",
            "offer_declined",
            "candidate_withdrawn",
            "invoice_enabled",
            "guarantee_tracking",
            "guarantee_period",
        ].includes(normalizedStatus)
    ) {
        return "__decision";
    }
    if (["offered", "offer_in_progress", "offer_accepted"].includes(normalizedStatus)) return "__offered";
    if (candidate.current_pipeline_stage && nodes.some((node) => node.id === candidate.current_pipeline_stage)) {
        return candidate.current_pipeline_stage;
    }

    if (stages.length === 0) {
        if (["interview", "interview_stage_1", "interview_stage_2", "interview_stage_3", "final_interview"].includes(normalizedStatus)) return "__interview";
        if (["reviewing", "under_client_review", "info_requested", "resubmitted"].includes(normalizedStatus)) return "__reviewing";
        return "__submitted";
    }

    if (["interview", "interview_stage_1", "interview_stage_2", "interview_stage_3", "final_interview"].includes(normalizedStatus)) {
        const interviewStage = stages.find((stage) => stage.type === "interview");
        if (interviewStage) return interviewStage.id;
        return stages[Math.min(1, stages.length - 1)]?.id || stages[0].id;
    }

    if ((["reviewing", "under_client_review", "info_requested", "resubmitted"].includes(normalizedStatus)) && stages[0]) {
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

export function CandidateProcessFlowchart({
    candidate,
    dict,
    eyebrow,
    helperText,
    className,
}: {
    candidate: any;
    dict: any;
    eyebrow?: string;
    helperText?: string | null;
    className?: string;
}) {
    const nodes = buildCandidatePipelineNodes(candidate, dict);
    const activeNodeId = getCandidateActivePipelineNodeId(candidate, nodes);
    const activeIndex = Math.max(nodes.findIndex((node) => node.id === activeNodeId), 0);
    const activeNode = nodes[activeIndex] || nodes[0];
    const isNegativeTerminal = candidate.status === "rejected" || candidate.status === "declined";

    return (
        <Card className={cn("border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden", className)}>
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <GitBranch className="h-3.5 w-3.5" />
                            {eyebrow || (dict.recruiter as any)?.hiringProcess || (dict.company as any)?.hiringProcess || "Rekryteringsprocess"}
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-900 truncate">
                            {activeNode?.label}
                        </p>
                        {activeNode?.description && (
                            <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">
                                {activeNode.description}
                            </p>
                        )}
                        {!activeNode?.description && helperText && (
                            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                {helperText}
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
