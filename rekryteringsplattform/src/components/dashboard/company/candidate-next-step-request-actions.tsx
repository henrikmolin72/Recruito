"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestCandidateNextStep } from "@/lib/actions/candidates";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/i18n/client";
import type { CompanyCandidateNextStep } from "@/types/db-types";

const NEXT_STEP_OPTIONS: Array<{ value: CompanyCandidateNextStep; labelKey: string }> = [
    { value: "request_tests", labelKey: "company.nextStepReqRequestTests" },
    { value: "pause_candidate", labelKey: "company.nextStepReqPause" },
    { value: "reject_candidate", labelKey: "company.nextStepReqReject" },
    { value: "proceed_to_hire", labelKey: "company.nextStepReqHire" },
];

function nextStepLabel(value: string | null | undefined, t: (key: string) => string) {
    const option = NEXT_STEP_OPTIONS.find((o) => o.value === value);
    return option ? t(option.labelKey) : null;
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
    const { t } = useTranslations();
    const [selected, setSelected] = useState<CompanyCandidateNextStep | undefined>(undefined);
    const [note, setNote] = useState("");
    const [resultMessage, setResultMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const currentLabel = useMemo(() => nextStepLabel(currentRequest, t), [currentRequest, t]);

    const handleSubmit = () => {
        if (!selected) {
            setError(t("company.nextStepReqSelectFirst"));
            return;
        }
        setError(null);
        setResultMessage(null);

        startTransition(async () => {
            const result = await requestCandidateNextStep(candidateId, jobId, selected, note);
            if (!result.success) {
                setError(result.error || t("company.nextStepReqError"));
                return;
            }
            setResultMessage(t("company.nextStepReqSent"));
            setSelected(undefined);
            setNote("");
            router.refresh();
        });
    };

    return (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 min-w-[320px]">
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("company.nextStepReqTitle")}</p>
                <p className="mt-1 text-xs text-slate-500">
                    {t("company.nextStepReqIntro")}
                </p>
                {currentLabel && (
                    <div className="mt-2 text-xs text-slate-600">
                        <span className="font-semibold">{t("company.nextStepReqLastSent")}</span> {currentLabel}
                        {currentRequestAt && (
                            <span className="text-slate-400"> • {new Date(currentRequestAt).toLocaleString()}</span>
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
                        <SelectValue placeholder={t("company.nextStepReqSelectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                        {NEXT_STEP_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {t(option.labelKey)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={isPending}
                    className="min-h-[70px]"
                    placeholder={t("company.nextStepReqNotePlaceholder")}
                />

                {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                {resultMessage && <p className="text-xs text-emerald-700 font-medium">{resultMessage}</p>}

                <Button onClick={handleSubmit} disabled={isPending || !selected} className="w-full">
                    {isPending ? t("company.nextStepReqSending") : t("company.nextStepReqSubmit")}
                </Button>
            </div>
        </div>
    );
}
