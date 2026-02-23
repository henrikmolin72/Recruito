"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestCandidateNextStep } from "@/lib/actions/candidates";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyCandidateNextStep } from "@/types/db-types";

const NEXT_STEP_OPTIONS: Array<{ value: CompanyCandidateNextStep; label: string }> = [
    { value: "request_tests", label: "Begära tester" },
    { value: "pause_candidate", label: "Pausa kandidaten" },
    { value: "reject_candidate", label: "Avböja kandidaten" },
    { value: "proceed_to_hire", label: "Gå vidare till anställa" },
];

function nextStepLabel(value?: string | null) {
    return NEXT_STEP_OPTIONS.find((option) => option.value === value)?.label || null;
}

export function CandidateNextStepRequestActions({
    candidateId,
    jobId,
    currentRequest,
    currentRequestNote,
    currentRequestAt,
}: {
    candidateId: string;
    jobId: string;
    currentRequest?: CompanyCandidateNextStep | null;
    currentRequestNote?: string | null;
    currentRequestAt?: string | null;
}) {
    const router = useRouter();
    const [selected, setSelected] = useState<CompanyCandidateNextStep | undefined>(undefined);
    const [note, setNote] = useState("");
    const [resultMessage, setResultMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const currentLabel = useMemo(() => nextStepLabel(currentRequest), [currentRequest]);

    const handleSubmit = () => {
        if (!selected) {
            setError("Välj nästa steg först.");
            return;
        }
        setError(null);
        setResultMessage(null);

        startTransition(async () => {
            const result = await requestCandidateNextStep(candidateId, jobId, selected, note);
            if (!result.success) {
                setError(result.error || "Kunde inte skicka nästa steg.");
                return;
            }
            setResultMessage("Nästa steg skickat till rekryteraren.");
            setSelected(undefined);
            setNote("");
            router.refresh();
        });
    };

    return (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 min-w-[320px]">
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nästa steg till rekryterare</p>
                <p className="mt-1 text-xs text-slate-500">
                    Skickar en begäran. Rekryteraren flyttar sedan kandidaten i pipelinen.
                </p>
                {currentLabel && (
                    <div className="mt-2 text-xs text-slate-600">
                        <span className="font-semibold">Senast skickat:</span> {currentLabel}
                        {currentRequestAt && (
                            <span className="text-slate-400"> • {new Date(currentRequestAt).toLocaleString("sv-SE")}</span>
                        )}
                        {currentRequestNote && (
                            <p className="mt-1 text-slate-500 italic">&quot;{currentRequestNote}&quot;</p>
                        )}
                    </div>
                )}
            </div>

            <div className="grid gap-3">
                <Select
                    value={selected}
                    onValueChange={(value) => setSelected(value as CompanyCandidateNextStep)}
                    disabled={isPending}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Välj nästa steg..." />
                    </SelectTrigger>
                    <SelectContent>
                        {NEXT_STEP_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={isPending}
                    className="min-h-[70px]"
                    placeholder="Kommentar till rekryteraren (valfritt)"
                />

                {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                {resultMessage && <p className="text-xs text-emerald-700 font-medium">{resultMessage}</p>}

                <Button onClick={handleSubmit} disabled={isPending || !selected} className="w-full">
                    {isPending ? "Skickar..." : "Skicka nästa steg"}
                </Button>
            </div>
        </div>
    );
}
