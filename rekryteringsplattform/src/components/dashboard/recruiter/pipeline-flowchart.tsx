"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { normalizeCandidateStatusForWorkflow } from "@/lib/candidate-workflow";
import {
    Search, MessageSquare, ClipboardCheck,
    CheckCircle2, ArrowRight, Inbox, Award, PauseCircle
} from "lucide-react";
import type { PipelineStage } from "@/types/db-types";
import { useTranslations } from "@/i18n/client";

interface FlowchartCandidate {
    id: string;
    first_name: string;
    last_name: string;
    current_pipeline_stage: string | null;
    status: string;
}

interface PipelineFlowchartProps {
    stages: PipelineStage[];
    candidates: FlowchartCandidate[];
}

function getStageIcon(type: string) {
    const icons: Record<string, React.ReactNode> = {
        screening: <Search className="h-5 w-5" />,
        interview: <MessageSquare className="h-5 w-5" />,
        test: <ClipboardCheck className="h-5 w-5" />,
        assessment: <ClipboardCheck className="h-5 w-5" />,
        system_submitted: <Inbox className="h-5 w-5" />,
        system_offered: <Award className="h-5 w-5" />,
        system_decision: <CheckCircle2 className="h-5 w-5" />,
        system_paused: <PauseCircle className="h-5 w-5" />,
    };
    return icons[type] || <Inbox className="h-5 w-5" />;
}

function getStageColors(type: string, hasCandidate: boolean) {
    if (!hasCandidate) {
        return "bg-slate-50 border-slate-200 text-slate-400";
    }
    const active: Record<string, string> = {
        screening: "bg-indigo-50 border-indigo-300 text-indigo-600",
        interview: "bg-purple-50 border-purple-300 text-purple-600",
        test: "bg-cyan-50 border-cyan-300 text-cyan-600",
        assessment: "bg-teal-50 border-teal-300 text-teal-600",
        system_submitted: "bg-blue-50 border-blue-300 text-blue-600",
        system_offered: "bg-amber-50 border-amber-300 text-amber-600",
        system_decision: "bg-green-50 border-green-300 text-green-600",
        system_paused: "bg-orange-50 border-orange-300 text-orange-600",
    };
    return active[type] || "bg-brand-50 border-brand-300 text-brand-600";
}

function getCandidatesForNode(
    nodeId: string,
    nodeType: string,
    candidates: FlowchartCandidate[]
): FlowchartCandidate[] {
    if (nodeId === '__submitted') {
        return candidates.filter((c) => {
            const status = normalizeCandidateStatusForWorkflow(c.status);
            return c.current_pipeline_stage === null && [
                'submitted',
                'under_client_review',
                'info_requested',
                'resubmitted',
            ].includes(status);
        });
    }
    if (nodeId === '__offered') {
        return candidates.filter((c) => {
            const status = normalizeCandidateStatusForWorkflow(c.status);
            return ['offer_in_progress', 'offer_accepted', 'offered', 'invoice_enabled', 'guarantee_tracking'].includes(status);
        });
    }
    if (nodeId === '__decision') {
        return candidates.filter((c) => {
            const status = normalizeCandidateStatusForWorkflow(c.status);
            return [
                'hired',
                'completed',
                'rejected',
                'declined',
                'duplicate_rejected',
                'client_already_engaged',
                'rejected_client',
                'rejected_interview',
                'offer_declined',
                'candidate_withdrawn',
            ].includes(status);
        });
    }
    if (nodeId === '__paused') {
        return candidates.filter((c) => {
            const status = normalizeCandidateStatusForWorkflow(c.status);
            return status === 'on_hold' || status === 'paused';
        });
    }
    return candidates.filter((c) => {
        if (c.current_pipeline_stage === nodeId) return true;
        // If no explicit custom stage is set, keep interview workflow statuses visible in interview columns.
        if (!c.current_pipeline_stage && nodeType === "interview") {
            const status = normalizeCandidateStatusForWorkflow(c.status);
            return ["interview_stage_1", "interview_stage_2", "interview_stage_3", "final_interview"].includes(status);
        }
        return false;
    });
}

export function PipelineFlowchart({ stages, candidates }: PipelineFlowchartProps) {
    const { t } = useTranslations();

    const sortedStages = [...stages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Mirrors company kanban columns: New/Reviewing -> [custom stages] -> Offer -> Decision -> Paused
    const flowNodes = [
        { id: '__submitted', title: t("components.kanbanNewReviewing") || 'Nya / Granskas', type: 'system_submitted' },
        ...sortedStages.map(s => ({ id: s.id, title: s.title, type: s.type })),
        { id: '__offered', title: t("components.kanbanOffer") || 'Erbjudande', type: 'system_offered' },
        { id: '__decision', title: t("components.kanbanDecision") || 'Beslut', type: 'system_decision' },
        { id: '__paused', title: t("components.kanbanPaused") || 'Pausade', type: 'system_paused' },
    ];

    return (
        <div
            className="overflow-x-auto pb-3
            [&::-webkit-scrollbar]:h-2
            [&::-webkit-scrollbar-track]:rounded-full
            [&::-webkit-scrollbar-track]:bg-slate-100
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-slate-300
            hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"
        >
            <div className="flex items-start gap-2 py-2 px-1 min-w-max">
                {flowNodes.map((node, index) => {
                    const nodeCandidates = getCandidatesForNode(node.id, node.type, candidates);
                    const hasCandidate = nodeCandidates.length > 0;

                    return (
                        <div key={node.id} className="flex items-center">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.06 }}
                                className={cn(
                                    "flex flex-col items-center p-4 rounded-xl border-2 min-w-[130px] transition-all",
                                    getStageColors(node.type, hasCandidate)
                                )}
                            >
                                <div className="mb-2">
                                    {getStageIcon(node.type)}
                                </div>
                                <span className="text-xs font-bold text-center leading-tight">
                                    {node.title}
                                </span>

                                {nodeCandidates.length > 0 && (
                                    <div className="mt-3 flex flex-col gap-1 w-full">
                                        {nodeCandidates.map(c => (
                                            <motion.span
                                                key={c.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="text-[10px] bg-white/80 backdrop-blur-sm text-slate-700 px-2 py-1 rounded-lg font-medium text-center border border-white/50 shadow-sm"
                                            >
                                                {c.first_name} {c.last_name[0]}.
                                            </motion.span>
                                        ))}
                                    </div>
                                )}

                                {nodeCandidates.length === 0 && (
                                    <span className="mt-2 text-[9px] text-slate-300 font-medium">
                                        {t("components.pipelineEmpty") || "Inga"}
                                    </span>
                                )}
                            </motion.div>

                            {index < flowNodes.length - 1 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.06 + 0.03 }}
                                >
                                    <ArrowRight className="h-4 w-4 text-slate-300 mx-1 flex-shrink-0" />
                                </motion.div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
