"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { claimMandate } from "@/lib/actions/recruiter";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/client";

export function TakeMandateButton({ jobId }: { jobId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { t } = useTranslations();

    const handleClaim = async () => {
        setLoading(true);
        const result = await claimMandate(jobId);
        if (result?.error) {
            alert(result.error);
        } else {
            router.push('/recruiter');
        }
        setLoading(false);
    };

    return (
        <Button
            size="sm"
            className="bg-success-500 hover:bg-success-700 text-white"
            onClick={handleClaim}
            disabled={loading}
        >
            {loading ? t("recruiter.takingMandate") : t("recruiter.takeMandate")}
        </Button>
    );
}
