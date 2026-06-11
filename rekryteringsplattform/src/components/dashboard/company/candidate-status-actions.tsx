"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateCandidateStatus } from "@/lib/actions/candidates";
import { Loader2 } from "lucide-react";
import { useTranslations } from "@/i18n/client";

export function CandidateStatusActions({
    candidateId,
    jobId,
    currentStatus
}: {
    candidateId: string,
    jobId: string,
    currentStatus: string
}) {
    const [status, setStatus] = useState(currentStatus);
    const [loading, setLoading] = useState(false);
    const { t } = useTranslations();

    const handleStatusChange = async (newStatus: string) => {
        setLoading(true);
        setStatus(newStatus);

        const result = await updateCandidateStatus(candidateId, jobId, newStatus);

        if (result.error) {
            // Revert on error (could use toast here)
            console.error(result.error);
            setStatus(currentStatus);
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{t("components.candidateStatusLabel")}</span>
            <Select
                value={status}
                onValueChange={handleStatusChange}
                disabled={loading}
            >
                <SelectTrigger className="w-[180px]">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    <SelectValue placeholder={t("components.candidateStatusPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="submitted">{t("components.candidateStatusSubmitted")}</SelectItem>
                    <SelectItem value="reviewing">{t("components.candidateStatusReviewing")}</SelectItem>
                    <SelectItem value="interview">{t("components.candidateStatusInterview")}</SelectItem>
                    <SelectItem value="offered">{t("components.candidateStatusOffer")}</SelectItem>
                    <SelectItem value="hired">{t("components.candidateStatusHired")}</SelectItem>
                    <SelectItem value="rejected">{t("components.candidateStatusRejected")}</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
