"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Edit, Ban, PauseCircle, PlayCircle } from "lucide-react";
import { closeJob, pauseJob, resumeJob } from "@/lib/actions/jobs";
import { useRouter } from "next/navigation";

export function JobActions({ jobId, status }: { jobId: string, status: string }) {
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();

    const handleClose = async () => {
        if (!confirm("Är du säker på att du vill stänga detta jobb? Det kommer inte längre att vara synligt för rekryterare.")) return;
        setLoading("close");
        await closeJob(jobId);
        router.refresh();
        setLoading(null);
    };

    const handlePause = async () => {
        setLoading("pause");
        await pauseJob(jobId);
        router.refresh();
        setLoading(null);
    };

    const handleResume = async () => {
        setLoading("resume");
        await resumeJob(jobId);
        router.refresh();
        setLoading(null);
    };

    return (
        <div className="flex gap-2">
            <Link href={`/company/jobs/${jobId}/edit`}>
                <Button variant="outline" className="gap-2">
                    <Edit className="h-4 w-4" /> Redigera
                </Button>
            </Link>

            {status === 'active' && (
                <Button variant="outline" onClick={handlePause} disabled={loading !== null} className="gap-2">
                    <PauseCircle className="h-4 w-4" />
                    {loading === "pause" ? "Pausar..." : "Pausa rekrytering"}
                </Button>
            )}

            {status === 'paused' && (
                <Button onClick={handleResume} disabled={loading !== null} className="gap-2">
                    <PlayCircle className="h-4 w-4" />
                    {loading === "resume" ? "Återupptar..." : "Återuppta rekrytering"}
                </Button>
            )}

            {(status === 'active' || status === 'paused') && (
                <Button variant="danger" onClick={handleClose} disabled={loading !== null} className="gap-2">
                    <Ban className="h-4 w-4" />
                    {loading === "close" ? "Stänger..." : "Stäng jobb"}
                </Button>
            )}
        </div>
    );
}
