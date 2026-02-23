"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveCandidateToPipelineStage, updateCandidateStatus } from "@/lib/actions/candidates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PipelineStage } from "@/types/db-types";
import { ArrowRightLeft, FastForward, PauseCircle, XCircle, CheckCircle2, Award } from "lucide-react";

function sortStages(stages: PipelineStage[] | null | undefined) {
    return [...(stages || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function RecruiterPipelineControls({
    candidateId,
    jobId,
    candidateStatus,
    currentPipelineStage,
    pipelineStages,
}: {
    candidateId: string;
    jobId: string;
    candidateStatus: string;
    currentPipelineStage?: string | null;
    pipelineStages?: PipelineStage[] | null;
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

    const run = (action: () => Promise<any>, okMessage: string) => {
        setError(null);
        setSuccess(null);
        startTransition(async () => {
            const result = await action();
            if (!result?.success) {
                setError(result?.error || "Kunde inte uppdatera kandidaten.");
                return;
            }
            setSuccess(okMessage);
            router.refresh();
        });
    };

    const moveToStage = (targetStageId?: string) => {
        if (!targetStageId) {
            setError("Välj ett steg först.");
            return;
        }
        run(
            () => moveCandidateToPipelineStage(candidateId, jobId, targetStageId),
            "Kandidaten flyttades i pipelinen."
        );
    };

    const setStatus = (status: string, label: string) => {
        run(
            () => updateCandidateStatus(candidateId, jobId, status),
            `Kandidaten markerades som ${label}.`
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
                            Rekryterarens pipelinekontroll
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                            Flytta kandidaten i processen och uppdatera företaget visuellt
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            Företagets sida är read-only och speglar ändringar härifrån.
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {stages.length > 0 ? (
                    <>
                        <div className="grid gap-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                Välj steg i pipeline
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Select
                                    value={selectedStageId}
                                    onValueChange={setSelectedStageId}
                                    disabled={isPending}
                                >
                                    <SelectTrigger className="sm:flex-1">
                                        <SelectValue placeholder="Välj steg..." />
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
                                    {isPending ? "Uppdaterar..." : "Flytta till valt steg"}
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
                                Föregående steg
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => moveToStage(nextStageId)}
                                disabled={isPending || !nextStageId}
                            >
                                <FastForward className="h-4 w-4 mr-1" />
                                Nästa steg
                            </Button>
                        </div>
                    </>
                ) : (
                    <p className="text-xs text-slate-500">
                        Detta jobb saknar custom pipeline-steg. Använd statusknapparna nedan.
                    </p>
                )}

                <div className="pt-1 border-t border-slate-100">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        Snabba statusval
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus("offered", "erbjudande")}
                            disabled={isPending || candidateStatus === "offered"}
                            className="gap-1.5"
                        >
                            <Award className="h-4 w-4" />
                            Erbjudande
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus("hired", "anställd")}
                            disabled={isPending || candidateStatus === "hired"}
                            className="gap-1.5"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Anställd
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus("paused", "pausad")}
                            disabled={isPending || candidateStatus === "paused"}
                            className="gap-1.5"
                        >
                            <PauseCircle className="h-4 w-4" />
                            Pausa
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus("rejected", "avböjd")}
                            disabled={isPending || candidateStatus === "rejected"}
                            className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        >
                            <XCircle className="h-4 w-4" />
                            Avböj
                        </Button>
                    </div>
                </div>

                {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                {success && <p className="text-xs text-emerald-700 font-medium">{success}</p>}
            </CardContent>
        </Card>
    );
}

