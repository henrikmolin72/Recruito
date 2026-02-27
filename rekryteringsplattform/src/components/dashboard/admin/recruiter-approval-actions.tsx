"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approveRecruiter, rejectRecruiter, suspendRecruiter } from "@/lib/actions/admin";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/client";

export function RecruiterApprovalActions({ recruiterId }: { recruiterId: string }) {
    const [loading, setLoading] = useState<string | null>(null);
    const [showRejectReason, setShowRejectReason] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
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
        if (!showRejectReason) {
            setShowRejectReason(true);
            return;
        }
        if (!rejectReason.trim()) {
            alert(t("admin.rejectionReasonRequired"));
            return;
        }
        setLoading("reject");
        const result = await rejectRecruiter(recruiterId, rejectReason.trim());
        if (result.error) {
            alert(t("common.error") + ": " + result.error);
        }
        router.refresh();
        setLoading(null);
        setShowRejectReason(false);
        setRejectReason("");
    };

    if (showRejectReason) {
        return (
            <div className="flex flex-col gap-2 min-w-[200px]">
                <Input
                    placeholder={t("admin.rejectionReasonPlaceholder")}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="h-7 text-xs"
                    autoFocus
                />
                <div className="flex gap-1">
                    <Button
                        size="sm"
                        variant="danger"
                        className="h-7 text-xs flex-1"
                        onClick={handleReject}
                        disabled={loading !== null}
                    >
                        {loading === "reject" ? "..." : t("admin.confirmReject")}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => { setShowRejectReason(false); setRejectReason(""); }}
                        disabled={loading !== null}
                    >
                        {t("common.cancel")}
                    </Button>
                </div>
            </div>
        );
    }

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

export function RecruiterManageActions({ recruiterId, status, rejectionReason }: { recruiterId: string; status: string; rejectionReason?: string }) {
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
            <div className="flex flex-col gap-1">
                <Button
                    size="sm"
                    className="bg-success-500 hover:bg-success-700 h-7 text-xs"
                    onClick={handleReapprove}
                    disabled={loading !== null}
                >
                    {loading === "approve" ? "..." : t("admin.reactivateButton")}
                </Button>
                {rejectionReason && (
                    <p className="text-[10px] text-danger-500 max-w-[180px] truncate" title={rejectionReason}>
                        {t("admin.reasonLabel")}: {rejectionReason}
                    </p>
                )}
            </div>
        );
    }

    return null;
}
