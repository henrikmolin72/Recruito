"use client";

import { useEffect, useTransition, useState } from "react";
import { updateCompanyStage } from "@/lib/actions/candidates";
import { CheckCircle2, XCircle } from "lucide-react";

type CompanyStage = "viewed" | "interview" | "final_interview" | "job_offer" | "hired" | "rejected";

const STAGES: Array<{ value: CompanyStage; label: string; activeClass: string }> = [
    { value: "viewed", label: "Viewed", activeClass: "bg-blue-600 text-white border-blue-600" },
    { value: "interview", label: "Interview", activeClass: "bg-blue-600 text-white border-blue-600" },
    { value: "final_interview", label: "Final Stage Interview", activeClass: "bg-blue-700 text-white border-blue-700" },
    { value: "job_offer", label: "Job Offer", activeClass: "bg-emerald-600 text-white border-emerald-600" },
    { value: "hired", label: "Hired", activeClass: "bg-emerald-700 text-white border-emerald-700" },
    { value: "rejected", label: "Rejected", activeClass: "bg-red-600 text-white border-red-600" },
];

export function CandidatePresentStatusPanel({
    candidateId,
    jobId,
    initialStage,
}: {
    candidateId: string;
    jobId: string;
    initialStage: string | null;
}) {
    const [currentStage, setCurrentStage] = useState<CompanyStage | null>(initialStage as CompanyStage | null);
    const [pendingStage, setPendingStage] = useState<CompanyStage | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!currentStage) {
            startTransition(async () => {
                const result = await updateCompanyStage(candidateId, jobId, "viewed");
                if (!result.error) setCurrentStage("viewed");
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStageClick = (stage: CompanyStage) => {
        if (stage === currentStage || isPending) return;
        setPendingStage(stage);
    };

    const confirmStageChange = () => {
        if (!pendingStage) return;
        const stage = pendingStage;
        setPendingStage(null);
        startTransition(async () => {
            const result = await updateCompanyStage(candidateId, jobId, stage);
            if (!result.error) setCurrentStage(stage);
        });
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Present Status</p>
            <div className="space-y-2">
                {STAGES.map((stage) => {
                    const isActive = currentStage === stage.value;
                    return (
                        <button
                            key={stage.value}
                            type="button"
                            onClick={() => handleStageClick(stage.value)}
                            disabled={isPending}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                                isActive
                                    ? stage.activeClass
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                            } disabled:opacity-60`}
                        >
                            <span>{stage.label}</span>
                            {isActive && (
                                stage.value === "rejected"
                                    ? <XCircle className="h-4 w-4" />
                                    : <CheckCircle2 className="h-4 w-4" />
                            )}
                        </button>
                    );
                })}
            </div>

            {pendingStage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setPendingStage(null)} />
                    <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h2 className="text-base font-bold text-slate-900 mb-2">Confirm Stage Change</h2>
                        <p className="text-sm text-slate-500 mb-6">
                            Move candidate to <strong>{STAGES.find(s => s.value === pendingStage)?.label}</strong>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setPendingStage(null)}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmStageChange}
                                className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
