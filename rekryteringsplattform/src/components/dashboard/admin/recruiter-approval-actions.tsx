"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { approveRecruiter, rejectRecruiter, suspendRecruiter } from "@/lib/actions/admin";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/client";

export function RecruiterApprovalActions({ recruiterId }: { recruiterId: string }) {
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();
    const { t } = useTranslations();

    const handleApprove = async () => {
        setLoading("approve");
        const result = await approveRecruiter(recruiterId);
        if (result.error) {
            alert(t("common.error") + ": " + result.error);
        }
        router.refresh();
        setLoading(null);
    };

    const handleReject = async () => {
        if (!confirm(t("admin.confirmRejectRecruiter"))) return;
        setLoading("reject");
        const result = await rejectRecruiter(recruiterId);
        if (result.error) {
            alert(t("common.error") + ": " + result.error);
        }
        router.refresh();
        setLoading(null);
    };

    return (
        <div className="flex gap-2">
            <Button
                size="sm"
                className="bg-success-500 hover:bg-success-700 h-7 text-xs"
                onClick={handleApprove}
                disabled={loading !== null}
            >
                {loading === "approve" ? "..." : t("admin.approveButton")}
            </Button>
            <Button
                size="sm"
                variant="danger"
                className="h-7 text-xs"
                onClick={handleReject}
                disabled={loading !== null}
            >
                {loading === "reject" ? "..." : t("admin.rejectButton")}
            </Button>
        </div>
    );
}

export function RecruiterManageActions({ recruiterId, status }: { recruiterId: string; status: string }) {
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();
    const { t } = useTranslations();

    const handleSuspend = async () => {
        if (!confirm(t("admin.confirmSuspendRecruiter"))) return;
        setLoading("suspend");
        const result = await suspendRecruiter(recruiterId);
        if (result.error) {
            alert(t("common.error") + ": " + result.error);
        }
        router.refresh();
        setLoading(null);
    };

    const handleReapprove = async () => {
        setLoading("approve");
        const result = await approveRecruiter(recruiterId);
        if (result.error) {
            alert(t("common.error") + ": " + result.error);
        }
        router.refresh();
        setLoading(null);
    };

    if (status === "approved") {
        return (
            <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-danger-500 hover:text-danger-700"
                onClick={handleSuspend}
                disabled={loading !== null}
            >
                {loading === "suspend" ? "..." : t("admin.suspendButton")}
            </Button>
        );
    }

    if (status === "suspended" || status === "rejected") {
        return (
            <Button
                size="sm"
                className="bg-success-500 hover:bg-success-700 h-7 text-xs"
                onClick={handleReapprove}
                disabled={loading !== null}
            >
                {loading === "approve" ? "..." : t("admin.reactivateButton")}
            </Button>
        );
    }

    return null;
}
