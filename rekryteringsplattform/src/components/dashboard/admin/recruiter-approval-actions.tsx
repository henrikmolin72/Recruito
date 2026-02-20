"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { approveRecruiter, rejectRecruiter, suspendRecruiter } from "@/lib/actions/admin";
import { useRouter } from "next/navigation";

export function RecruiterApprovalActions({ recruiterId }: { recruiterId: string }) {
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();

    const handleApprove = async () => {
        setLoading("approve");
        const result = await approveRecruiter(recruiterId);
        if (result.error) {
            alert("Fel: " + result.error);
        }
        router.refresh();
        setLoading(null);
    };

    const handleReject = async () => {
        if (!confirm("Är du säker på att du vill neka denna rekryterare?")) return;
        setLoading("reject");
        const result = await rejectRecruiter(recruiterId);
        if (result.error) {
            alert("Fel: " + result.error);
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
                {loading === "approve" ? "..." : "Godkänn"}
            </Button>
            <Button
                size="sm"
                variant="danger"
                className="h-7 text-xs"
                onClick={handleReject}
                disabled={loading !== null}
            >
                {loading === "reject" ? "..." : "Neka"}
            </Button>
        </div>
    );
}

export function RecruiterManageActions({ recruiterId, status }: { recruiterId: string; status: string }) {
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();

    const handleSuspend = async () => {
        if (!confirm("Är du säker på att du vill stänga av denna rekryterare?")) return;
        setLoading("suspend");
        const result = await suspendRecruiter(recruiterId);
        if (result.error) {
            alert("Fel: " + result.error);
        }
        router.refresh();
        setLoading(null);
    };

    const handleReapprove = async () => {
        setLoading("approve");
        const result = await approveRecruiter(recruiterId);
        if (result.error) {
            alert("Fel: " + result.error);
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
                {loading === "suspend" ? "..." : "Stäng av"}
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
                {loading === "approve" ? "..." : "Återaktivera"}
            </Button>
        );
    }

    return null;
}
