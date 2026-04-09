"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Edit, Ban, PauseCircle, PlayCircle, X } from "lucide-react";
import { closeJob, pauseJob, resumeJob } from "@/lib/actions/jobs";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/client";

const CLOSE_REASONS = [
    "Hired via Recruito",
    "Hired via another source",
    "No suitable candidates received",
    "Position no longer required",
    "Hiring put on hold",
    "Role filled internally",
    "Other",
] as const;

export function JobActions({ jobId, status }: { jobId: string, status: string }) {
    const [loading, setLoading] = useState<string | null>(null);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [selectedReason, setSelectedReason] = useState<string>("");
    const router = useRouter();
    const { t } = useTranslations();

    const handleClose = async () => {
        if (!selectedReason) return;
        setLoading("close");
        try {
            await closeJob(jobId, selectedReason);
            setShowCloseModal(false);
            router.refresh();
        } catch {
            // Server action failed silently
        } finally {
            setLoading(null);
        }
    };

    const handlePause = async () => {
        setLoading("pause");
        try {
            await pauseJob(jobId);
            router.refresh();
        } catch {
            // Server action failed silently
        } finally {
            setLoading(null);
        }
    };

    const handleResume = async () => {
        setLoading("resume");
        try {
            await resumeJob(jobId);
            router.refresh();
        } catch {
            // Server action failed silently
        } finally {
            setLoading(null);
        }
    };

    return (
        <>
            <div className="flex gap-2">
                {status === 'draft' && (
                    <Link href={`/company/jobs/${jobId}/edit`}>
                        <Button variant="outline" className="gap-2">
                            <Edit className="h-4 w-4" /> {t("components.jobActionsEdit")}
                        </Button>
                    </Link>
                )}

                {status === 'active' && (
                    <Button variant="outline" onClick={handlePause} disabled={loading !== null} className="gap-2">
                        <PauseCircle className="h-4 w-4" />
                        {loading === "pause" ? t("components.jobActionsPausing") : t("components.jobActionsPauseRecruitment")}
                    </Button>
                )}

                {status === 'paused' && (
                    <Button onClick={handleResume} disabled={loading !== null} className="gap-2">
                        <PlayCircle className="h-4 w-4" />
                        {loading === "resume" ? t("components.jobActionsResuming") : t("components.jobActionsResumeRecruitment")}
                    </Button>
                )}

                {(status === 'active' || status === 'paused') && (
                    <Button
                        variant="danger"
                        onClick={() => { setSelectedReason(""); setShowCloseModal(true); }}
                        disabled={loading !== null}
                        className="gap-2"
                    >
                        <Ban className="h-4 w-4" />
                        {loading === "close" ? t("components.jobActionsClosing") : t("components.jobActionsCloseJob")}
                    </Button>
                )}
            </div>

            {/* Close job modal */}
            {showCloseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setShowCloseModal(false)}
                    />
                    {/* Modal */}
                    <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900">
                                {t("components.jobActionsCloseJob")}
                            </h2>
                            <button
                                onClick={() => setShowCloseModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <p className="text-sm text-slate-500 mb-5">
                            {t("components.closeJobReasonPrompt") || "Please select a reason for closing this job:"}
                        </p>

                        <div className="space-y-2 mb-6">
                            {CLOSE_REASONS.map((reason) => (
                                <label
                                    key={reason}
                                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-all text-sm font-medium ${
                                        selectedReason === reason
                                            ? "border-brand-500 bg-brand-50 text-brand-700"
                                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="close_reason"
                                        value={reason}
                                        checked={selectedReason === reason}
                                        onChange={() => setSelectedReason(reason)}
                                        className="sr-only"
                                    />
                                    <span className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                        selectedReason === reason ? "border-brand-500" : "border-slate-300"
                                    }`}>
                                        {selectedReason === reason && (
                                            <span className="h-2 w-2 rounded-full bg-brand-500" />
                                        )}
                                    </span>
                                    {reason}
                                </label>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowCloseModal(false)}
                                disabled={loading !== null}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleClose}
                                disabled={!selectedReason || loading !== null}
                                className="gap-2"
                            >
                                <Ban className="h-4 w-4" />
                                {loading === "close" ? t("components.jobActionsClosing") : t("components.jobActionsCloseJob")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
