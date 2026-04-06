"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Edit, Ban, PauseCircle, PlayCircle } from "lucide-react";
import { closeJob, pauseJob, resumeJob } from "@/lib/actions/jobs";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/client";

export function JobActions({ jobId, status }: { jobId: string, status: string }) {
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();
    const { t } = useTranslations();

    const handleClose = async () => {
        if (!confirm(t("components.jobActionsCloseConfirm"))) return;
        setLoading("close");
        try {
            await closeJob(jobId);
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
                <Button variant="danger" onClick={handleClose} disabled={loading !== null} className="gap-2">
                    <Ban className="h-4 w-4" />
                    {loading === "close" ? t("components.jobActionsClosing") : t("components.jobActionsCloseJob")}
                </Button>
            )}
        </div>
    );
}
