"use client";

import { useState } from "react";
import { GuaranteeTimer } from "./guarantee-timer";
import { BreachReportForm } from "./breach-report-form";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

interface GuaranteeBillingRowProps {
    placementId: string;
    candidateName: string;
    jobTitle: string;
    guaranteeEndDate: string | null;
    guaranteeStartDate?: string | null;
    status: string;
    currency?: string;
}

export function GuaranteeBillingRow({
    placementId,
    candidateName,
    jobTitle,
    guaranteeEndDate,
    guaranteeStartDate,
    status,
    currency = "SEK",
}: GuaranteeBillingRowProps) {
    const { t } = useTranslations();
    const isActive = status === "guarantee_active";
    const hasBreach = status === "refund_processing" || status === "guarantee_failed";

    if (!guaranteeEndDate) return null;

    return (
        <div className="mt-3 space-y-3">
            <GuaranteeTimer
                guaranteeEndDate={guaranteeEndDate}
                guaranteeStartDate={guaranteeStartDate}
                candidateName={candidateName}
                jobTitle={jobTitle}
            />
            {isActive && (
                <BreachReportForm
                    placementId={placementId}
                    candidateName={candidateName}
                    jobTitle={jobTitle}
                    currency={currency}
                />
            )}
            {hasBreach && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 font-semibold">
                    {t("components.breachAwaitingReview")}
                </div>
            )}
        </div>
    );
}
