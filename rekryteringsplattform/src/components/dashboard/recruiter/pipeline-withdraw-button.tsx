"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { withdrawCandidate } from "@/lib/actions/candidates";
import { CANDIDATE_WITHDRAW_REASONS } from "@/lib/candidate-workflow";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check } from "lucide-react";

// Pipeline-row withdraw. Withdrawal is irreversible, so it opens a confirmation
// overlay ("transparent list") where the recruiter must pick a reason before
// confirming — the row button alone never mutates. Stage-gating (which rows get
// this button) is decided by the server page; the withdrawCandidate action is
// the authoritative guard and rejects terminal/hired statuses regardless.
type Labels = {
    withdraw: string;
    title: string;
    warning: string;
    selectReason: string;
    confirm: string;
    cancel: string;
    updating: string;
    errorFallback: string;
};

export function PipelineWithdrawButton({
    candidateId,
    jobId,
    candidateName,
    labels,
}: {
    candidateId: string;
    jobId: string;
    candidateName: string;
    labels: Labels;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const close = () => {
        if (isPending) return;
        setOpen(false);
        setReason("");
        setError(null);
    };

    const confirm = () => {
        if (!reason) return;
        setError(null);
        startTransition(async () => {
            const result = await withdrawCandidate(candidateId, jobId, reason);
            if (!result?.success) {
                setError(result?.error || labels.errorFallback);
                return;
            }
            setOpen(false);
            setReason("");
            router.refresh();
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-sm font-semibold text-rose-600 hover:text-rose-700"
            >
                {labels.withdraw}
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    onClick={close}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-bold text-slate-900">{labels.title}</h2>
                                {candidateName && <p className="mt-0.5 truncate text-sm text-slate-500">{candidateName}</p>}
                            </div>
                        </div>

                        <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50/60 p-3">
                            <p className="text-xs font-medium text-rose-700">{labels.warning}</p>
                        </div>

                        <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                            {labels.selectReason}
                        </p>
                        <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                            {CANDIDATE_WITHDRAW_REASONS.map((r) => {
                                const selected = reason === r.key;
                                return (
                                    <li key={r.key}>
                                        <button
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => setReason(r.key)}
                                            className={
                                                "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors " +
                                                (selected
                                                    ? "border-rose-300 bg-rose-50 font-semibold text-rose-700"
                                                    : "border-slate-200 text-slate-700 hover:border-rose-200 hover:bg-rose-50/40")
                                            }
                                        >
                                            <span>{r.label}</span>
                                            {selected && <Check className="h-4 w-4 shrink-0" />}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        {error && <p className="mt-3 text-xs font-medium text-rose-600">{error}</p>}

                        <div className="mt-5 flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={close} disabled={isPending}>
                                {labels.cancel}
                            </Button>
                            <Button
                                type="button"
                                onClick={confirm}
                                disabled={isPending || !reason}
                                className="bg-rose-600 text-white hover:bg-rose-700"
                            >
                                {isPending ? labels.updating : labels.confirm}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
