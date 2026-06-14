"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveCandidateToPipelineStage, updateCandidateStatus, withdrawCandidate } from "@/lib/actions/candidates";
import { getRecruiterAllowedTransitions, CANDIDATE_WITHDRAW_REASONS } from "@/lib/candidate-workflow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PipelineStage } from "@/types/db-types";
import { ArrowRightLeft, FastForward } from "lucide-react";

function sortStages(stages: PipelineStage[] | null | undefined) {
    return [...(stages || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

const STATUS_LABELS: Record<string, string> = {
    duplicate_rejected: "Duplicate – Rejected",
    client_already_engaged: "Client Already Engaged",
    under_client_review: "Under Client Review",
    info_requested: "Info Requested",
    resubmitted: "Resubmitted",
    interview_stage_1: "Interview Stage 1",
    interview_stage_2: "Interview Stage 2",
    interview_stage_3: "Interview Stage 3",
    final_interview: "Final Interview",
    rejected_client: "Rejected – Client",
    rejected_interview: "Rejected – Interview",
    on_hold: "On Hold",
    offer_in_progress: "Offer in Progress",
    offer_declined: "Offer Declined",
    offer_accepted: "Offer Accepted",
    invoice_enabled: "Invoice Enabled",
    guarantee_tracking: "Guarantee Tracking",
    candidate_withdrawn: "Candidate Withdrawn",
    hired: "Hired",
    completed: "Completed",
    submitted: "Submitted",
    reviewing: "Reviewing",
    interview: "Interview",
    offered: "Offered",
    paused: "Paused",
    rejected: "Rejected",
    declined: "Declined",
};

export function RecruiterPipelineControls({
    candidateId,
    jobId,
    candidateStatus,
    currentPipelineStage,
    pipelineStages,
    dict: r,
}: {
    candidateId: string;
    jobId: string;
    candidateStatus: string;
    currentPipelineStage?: string | null;
    pipelineStages?: PipelineStage[] | null;
    dict: Record<string, string>;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const stages = useMemo(() => sortStages(pipelineStages), [pipelineStages]);
    const currentIndex = useMemo(
        () => stages.findIndex((stage) => stage.id === currentPipelineStage),
        [stages, currentPipelineStage]
    );

    const initialSelect = currentPipelineStage && stages.some((s) => s.id === currentPipelineStage)
        ? currentPipelineStage
        : stages[0]?.id || "";
    const [selectedStageId, setSelectedStageId] = useState(initialSelect);

    const nextStageId = currentIndex >= 0 ? stages[currentIndex + 1]?.id : stages[0]?.id;
    const prevStageId = currentIndex > 0 ? stages[currentIndex - 1]?.id : undefined;
    const allowedStatusTransitions = useMemo(
        () => getRecruiterAllowedTransitions(candidateStatus),
        [candidateStatus]
    );
    const [selectedStatus, setSelectedStatus] = useState<string>(allowedStatusTransitions[0] || "");
    const [withdrawReason, setWithdrawReason] = useState<string>(CANDIDATE_WITHDRAW_REASONS[0].key);

    const run = (action: () => Promise<any>, okMessage: string) => {
        setError(null);
        setSuccess(null);
        startTransition(async () => {
            const result = await action();
            if (!result?.success) {
                setError(result?.error || r.pipelineUpdateError || "Kunde inte uppdatera kandidaten.");
                return;
            }
            setSuccess(okMessage);
            router.refresh();
        });
    };

    const moveToStage = (targetStageId?: string) => {
        if (!targetStageId) {
            setError(r.pipelineSelectStepFirst || "Välj ett steg först.");
            return;
        }
        run(
            () => moveCandidateToPipelineStage(candidateId, jobId, targetStageId),
            r.pipelineMovedSuccess || "Kandidaten flyttades i pipelinen."
        );
    };

    const setStatus = (status: string, label: string) => {
        run(
            () => updateCandidateStatus(candidateId, jobId, status),
            (r.pipelineMarkedAs || "Kandidaten markerades som {label}.").replace("{label}", label)
        );
    };

    const withdraw = () => {
        run(
            () => withdrawCandidate(candidateId, jobId, withdrawReason),
            r.pipelineWithdrawnSuccess || "Kandidaten drogs tillbaka."
        );
    };

    return (
        <Card className="border-none shadow-xl shadow-brand-100/40 bg-gradient-to-br from-brand-50/60 to-white">
            <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white border border-brand-200 text-brand-700 flex items-center justify-center">
                        <ArrowRightLeft className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-700/70">
                            {r.pipelineControlTitle || "Rekryterarens pipelinekontroll"}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                            {r.pipelineControlSubtitle || "Flytta kandidaten i processen och uppdatera företaget visuellt"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            {r.pipelineControlReadOnlyNote || "Företagets sida är read-only och speglar ändringar härifrån."}
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {stages.length > 0 ? (
                    <>
                        <div className="grid gap-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                {r.pipelineSelectStageLabel || "Välj steg i pipeline"}
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Select
                                    value={selectedStageId}
                                    onValueChange={setSelectedStageId}
                                    disabled={isPending}
                                >
                                    <SelectTrigger className="sm:flex-1">
                                        <SelectValue placeholder={r.pipelineSelectStagePlaceholder || "Välj steg..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stages.map((stage) => (
                                            <SelectItem key={stage.id} value={stage.id}>
                                                {stage.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={() => moveToStage(selectedStageId)}
                                    disabled={isPending || !selectedStageId}
                                    className="sm:min-w-[180px]"
                                >
                                    {isPending ? (r.updating || "Uppdaterar...") : (r.moveToSelectedStage || "Flytta till valt steg")}
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => moveToStage(prevStageId)}
                                disabled={isPending || !prevStageId}
                            >
                                {r.previousStep || "Föregående steg"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => moveToStage(nextStageId)}
                                disabled={isPending || !nextStageId}
                            >
                                <FastForward className="h-4 w-4 mr-1" />
                                {r.nextStep || "Nästa steg"}
                            </Button>
                        </div>
                    </>
                ) : (
                    <p className="text-xs text-slate-500">
                        {r.pipelineNoCustomStages || "Detta jobb saknar custom pipeline-steg. Använd statusknapparna nedan."}
                    </p>
                )}

                <div className="pt-1 border-t border-slate-100">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        {r.workflowNextStep || "Workflow nästa steg"}
                    </p>
                    {allowedStatusTransitions.length > 0 ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Select
                                value={selectedStatus}
                                onValueChange={setSelectedStatus}
                                disabled={isPending}
                            >
                                <SelectTrigger className="sm:flex-1">
                                    <SelectValue placeholder={r.pipelineSelectWorkflowStep || "Välj nästa workflow-steg"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {allowedStatusTransitions.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {STATUS_LABELS[status] || status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isPending || !selectedStatus}
                                onClick={() => setStatus(selectedStatus, STATUS_LABELS[selectedStatus] || selectedStatus)}
                                className="sm:min-w-[220px]"
                            >
                                {isPending ? (r.updating || "Uppdaterar...") : (r.applyWorkflowStatus || "Applicera workflow-status")}
                            </Button>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500">
                            {r.pipelineNoMoreSteps || "Inga fler tillåtna steg från nuvarande status."}
                        </p>
                    )}
                </div>

                <div className="pt-1 border-t border-slate-100">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        {r.withdrawCandidate || "Dra tillbaka kandidat"}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Select
                            value={withdrawReason}
                            onValueChange={setWithdrawReason}
                            disabled={isPending}
                        >
                            <SelectTrigger className="sm:flex-1">
                                <SelectValue placeholder={r.pipelineSelectReason || "Välj anledning"} />
                            </SelectTrigger>
                            <SelectContent>
                                {CANDIDATE_WITHDRAW_REASONS.map((reason) => (
                                    <SelectItem key={reason.key} value={reason.key}>
                                        {reason.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isPending || !withdrawReason}
                            onClick={withdraw}
                            className="sm:min-w-[220px] text-rose-700 border-rose-200 hover:bg-rose-50"
                        >
                            {isPending ? (r.updating || "Uppdaterar...") : (r.withdrawCandidate || "Dra tillbaka kandidat")}
                        </Button>
                    </div>
                </div>

                {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                {success && <p className="text-xs text-emerald-700 font-medium">{success}</p>}
            </CardContent>
        </Card>
    );
}
