"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Edit, Ban, PauseCircle, PlayCircle, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { closeJob, pauseJob, resumeJob, publishJob, markJobAsFilled, cancelJob } from "@/lib/actions/jobs";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/client";
import { toast } from "sonner";

export function JobActions({ jobId, status }: { jobId: string, status: string }) {
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();
    const { t } = useTranslations();

    const handleAction = async (action: () => Promise<any>, key: string, successMsg?: string) => {
        setLoading(key);
        const result = await action();
        if (result?.error) {
            toast.error(result.error);
        } else if (successMsg) {
            toast.success(successMsg);
        }
        router.refresh();
        setLoading(null);
    };

    const handleClose = async () => {
        if (!confirm(t("components.jobActionsCloseConfirm"))) return;
        await handleAction(() => closeJob(jobId), "close");
    };

    const handlePause = () => handleAction(() => pauseJob(jobId), "pause");
    const handleResume = () => handleAction(() => resumeJob(jobId), "resume");
    const handlePublish = () => handleAction(() => publishJob(jobId), "publish", t("jobForm.jobPublished") || "Jobbet har publicerats!");
    const handleFilled = async () => {
        if (!confirm(t("components.jobActionsFilledConfirm") || "Markera jobbet som tillsatt? Inga fler kandidater kan presenteras.")) return;
        await handleAction(() => markJobAsFilled(jobId), "filled");
    };
    const handleCancel = async () => {
        if (!confirm(t("components.jobActionsCancelConfirm") || "Avbryt detta jobb? Denna åtgärd kan inte ångras.")) return;
        await handleAction(() => cancelJob(jobId), "cancel");
    };

    return (
        <div className="flex gap-2 flex-wrap">
            {status !== 'closed' && status !== 'cancelled' && status !== 'filled' && (
                <Link href={`/company/jobs/${jobId}/edit`}>
                    <Button variant="outline" className="gap-2">
                        <Edit className="h-4 w-4" /> {t("components.jobActionsEdit")}
                    </Button>
                </Link>
            )}

            {status === 'draft' && (
                <Button onClick={handlePublish} disabled={loading !== null}
                    className="bg-success-600 hover:bg-success-700 text-white gap-2">
                    <Sparkles className="h-4 w-4" />
                    {loading === "publish" ? (t("jobForm.publishing") || "Publicerar...") : (t("components.jobActionsPublish") || "Publicera")}
                </Button>
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

            {status === 'active' && (
                <Button variant="outline" onClick={handleFilled} disabled={loading !== null} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {loading === "filled" ? (t("components.jobActionsMarking") || "Markerar...") : (t("components.jobActionsMarkFilled") || "Markera tillsatt")}
                </Button>
            )}

            {(status === 'active' || status === 'paused') && (
                <Button variant="danger" onClick={handleClose} disabled={loading !== null} className="gap-2">
                    <Ban className="h-4 w-4" />
                    {loading === "close" ? t("components.jobActionsClosing") : t("components.jobActionsCloseJob")}
                </Button>
            )}

            {(status === 'draft' || status === 'active' || status === 'paused') && (
                <Button variant="ghost" onClick={handleCancel} disabled={loading !== null} className="gap-2 text-red-500 hover:text-red-700">
                    <XCircle className="h-4 w-4" />
                    {loading === "cancel" ? (t("components.jobActionsCancelling") || "Avbryter...") : (t("components.jobActionsCancel") || "Avbryt")}
                </Button>
            )}
        </div>
    );
}
