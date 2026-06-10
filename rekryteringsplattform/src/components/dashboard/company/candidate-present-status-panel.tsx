"use client";

import { useTransition, useState, useEffect, useRef } from "react";
import { updateCompanyStage, markOfferAccepted } from "@/lib/actions/candidates";
import { CheckCircle2, XCircle, Handshake, Clock } from "lucide-react";

// Hiring-timeline window shown to the client after they open a candidate. The
// previous 5-day response-window counter was replaced by this 45-day hiring
// timeline, which better reflects the overall recruitment process.
const HIRING_TIMELINE_DAYS = 45;

function daysRemaining(viewedAt: string | null): number | null {
    if (!viewedAt) return null;
    const start = new Date(viewedAt).getTime();
    if (Number.isNaN(start)) return null;
    const elapsed = Date.now() - start;
    const remainingMs = HIRING_TIMELINE_DAYS * 86_400_000 - elapsed;
    return Math.max(0, Math.ceil(remainingMs / 86_400_000));
}

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
    initialOfferAccepted = false,
    initialViewedAt = null,
    candidateStatus = null,
}: {
    candidateId: string;
    jobId: string;
    initialStage: string | null;
    initialOfferAccepted?: boolean;
    initialViewedAt?: string | null;
    candidateStatus?: string | null;
}) {
    // Withdrawn is set by the recruiter, never by the client — shown here
    // read-only, and it locks the panel (no further progression).
    const isWithdrawn = candidateStatus === "candidate_withdrawn";
    const [currentStage, setCurrentStage] = useState<CompanyStage | null>(initialStage as CompanyStage | null);
    const [pendingStage, setPendingStage] = useState<CompanyStage | null>(null);
    const [offerAccepted, setOfferAccepted] = useState(initialOfferAccepted);
    const [offerError, setOfferError] = useState<string | null>(null);
    const [viewedAt, setViewedAt] = useState<string | null>(initialViewedAt);
    const [isPending, startTransition] = useTransition();
    const autoViewFired = useRef(false);

    // Opening the candidate profile IS the view event: on first open, mark the
    // candidate viewed, which notifies the recruiter and starts the 45-day
    // hiring timeline. The one-time access-confirmation popup (shown before
    // navigation, once per company) is the client's consent gate for this.
    useEffect(() => {
        if (isWithdrawn || currentStage || autoViewFired.current) return;
        autoViewFired.current = true;
        startTransition(async () => {
            const result = await updateCompanyStage(candidateId, jobId, "viewed");
            if (!result.error) {
                setCurrentStage("viewed");
                setViewedAt(new Date().toISOString());
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleMarkOfferAccepted = () => {
        setOfferError(null);
        startTransition(async () => {
            const result = await markOfferAccepted(candidateId, jobId);
            if (result?.error) setOfferError(result.error);
            else setOfferAccepted(true);
        });
    };

    const handleStageClick = (stage: CompanyStage) => {
        if (isWithdrawn || stage === currentStage || isPending) return;
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

    const remaining = daysRemaining(viewedAt);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Present Status</p>
                {remaining !== null && (
                    <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            remaining === 0
                                ? "bg-slate-100 text-slate-500 border-slate-200"
                                : remaining <= 5
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : remaining <= 14
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                        title={`Viewed ${viewedAt ? new Date(viewedAt).toLocaleString() : ""} · ${HIRING_TIMELINE_DAYS}-day hiring timeline`}
                    >
                        <Clock className="h-3 w-3" />
                        {remaining === 0 ? "Timeline ended" : `${remaining}d left`}
                    </span>
                )}
            </div>
            <div className="space-y-2">
                {STAGES.map((stage) => {
                    const isActive = currentStage === stage.value;
                    return (
                        <button
                            key={stage.value}
                            type="button"
                            onClick={() => handleStageClick(stage.value)}
                            disabled={isPending || isWithdrawn}
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
                {/* Withdrawn is recruiter-triggered; read-only on the client side. */}
                <div
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-semibold ${
                        isWithdrawn
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}
                    title="Set by the recruiter when the candidate is withdrawn from the process"
                >
                    <span>Withdrawn</span>
                    {isWithdrawn && <XCircle className="h-4 w-4" />}
                </div>
            </div>
            {isWithdrawn && (
                <p className="text-[11px] text-slate-500">
                    The recruiter has withdrawn this candidate. The process is closed and can only be reopened by an administrator.
                </p>
            )}

            {currentStage === "job_offer" && !isWithdrawn && (
                <div className="pt-2 border-t border-slate-100">
                    {offerAccepted ? (
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg py-2">
                            <Handshake className="h-4 w-4" />
                            Offer accepted by candidate
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleMarkOfferAccepted}
                            disabled={isPending}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-60"
                        >
                            <Handshake className="h-4 w-4" />
                            {isPending ? "Saving…" : "Mark offer accepted"}
                        </button>
                    )}
                    {offerError && <p className="mt-1 text-[10px] text-red-600 text-center">{offerError}</p>}
                </div>
            )}

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
