"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearCandidateNextStepRequest, moveCandidateToPipelineStage, updateCandidateStatus } from "@/lib/actions/candidates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CompanyCandidateNextStep, PipelineStage } from "@/types/db-types";
import { Beaker, PauseCircle, CheckCircle2, XCircle, Sparkles } from "lucide-react";

function requestLabel(request: CompanyCandidateNextStep | null | undefined) {
    switch (request) {
        case "request_tests":
            return "Beställaren begär tester";
        case "pause_candidate":
            return "Beställaren vill pausa kandidaten";
        case "reject_candidate":
            return "Beställaren vill avböja kandidaten";
        case "proceed_to_hire":
            return "Beställaren vill gå vidare till anställning";
        default:
            return null;
    }
}

function requestIcon(request: CompanyCandidateNextStep | null | undefined) {
    switch (request) {
        case "request_tests":
            return <Beaker className="h-4 w-4" />;
        case "pause_candidate":
            return <PauseCircle className="h-4 w-4" />;
        case "reject_candidate":
            return <XCircle className="h-4 w-4" />;
        case "proceed_to_hire":
            return <CheckCircle2 className="h-4 w-4" />;
        default:
            return <Sparkles className="h-4 w-4" />;
    }
}

export function CompanyNextStepPanel({
    candidateId,
    jobId,
    candidateStatus,
    pendingRequest,
    pendingRequestNote,
    pendingRequestAt,
    pipelineStages,
}: {
    candidateId: string;
    jobId: string;
    candidateStatus: string;
    pendingRequest?: CompanyCandidateNextStep | null;
    pendingRequestNote?: string | null;
    pendingRequestAt?: string | null;
    pipelineStages?: PipelineStage[] | null;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [selectedTestStage, setSelectedTestStage] = useState<string>("");

    const testStages = useMemo(
        () => (pipelineStages || [])
            .filter((stage) => stage.type === "test" || stage.type === "assessment")
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        [pipelineStages]
    );

    if (!pendingRequest) return null;

    const runAction = (action: () => Promise<any>, successText: string) => {
        setError(null);
        setMessage(null);
        startTransition(async () => {
            const result = await action();
            if (!result?.success) {
                setError(result?.error || "Kunde inte uppdatera kandidaten.");
                return;
            }
            setMessage(successText);
            router.refresh();
        });
    };

    const applyPendingRequest = () => {
        if (pendingRequest === "request_tests") {
            if (!selectedTestStage) {
                setError("Välj teststeg först.");
                return;
            }
            runAction(
                () => moveCandidateToPipelineStage(candidateId, jobId, selectedTestStage),
                "Kandidaten flyttades till teststeg och begäran markerades som hanterad."
            );
            return;
        }

        const statusMap: Record<Exclude<CompanyCandidateNextStep, "request_tests">, string> = {
            pause_candidate: "paused",
            reject_candidate: "rejected",
            proceed_to_hire: "hired",
        };

        runAction(
            () => updateCandidateStatus(candidateId, jobId, statusMap[pendingRequest as Exclude<CompanyCandidateNextStep, "request_tests">]),
            "Status uppdaterad och beställarens begäran markerades som hanterad."
        );
    };

    const clearRequestOnly = () => {
        runAction(
            () => clearCandidateNextStepRequest(candidateId, jobId),
            "Begäran rensades."
        );
    };

    return (
        <Card className="border-none shadow-xl shadow-amber-100/60 bg-gradient-to-br from-amber-50 to-white">
            <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white border border-amber-200 text-amber-700 flex items-center justify-center">
                        {requestIcon(pendingRequest)}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700/70">Beställarens nästa steg</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{requestLabel(pendingRequest)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                            Nuvarande kandidatstatus: <span className="font-semibold">{candidateStatus}</span>
                            {pendingRequestAt && <span className="text-slate-400"> • {new Date(pendingRequestAt).toLocaleString("sv-SE")}</span>}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {pendingRequestNote && (
                    <div className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Kommentar</span>
                        {pendingRequestNote}
                    </div>
                )}

                {pendingRequest === "request_tests" && (
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Välj teststeg i pipeline</label>
                        {testStages.length > 0 ? (
                            <Select
                                value={selectedTestStage}
                                onValueChange={setSelectedTestStage}
                                disabled={isPending}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Välj test/bedömning..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {testStages.map((stage) => (
                                        <SelectItem key={stage.id} value={stage.id}>
                                            {stage.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <p className="text-xs text-rose-600">
                                Inga test/bedömningssteg finns i pipelinen för detta jobb.
                            </p>
                        )}
                    </div>
                )}

                {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                {message && <p className="text-xs text-emerald-700 font-medium">{message}</p>}

                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={applyPendingRequest}
                        disabled={
                            isPending ||
                            (pendingRequest === "request_tests" && (!selectedTestStage || testStages.length === 0))
                        }
                    >
                        {isPending ? "Uppdaterar..." : "Applicera i pipeline/status"}
                    </Button>
                    <Button variant="outline" onClick={clearRequestOnly} disabled={isPending}>
                        Rensa begäran
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
