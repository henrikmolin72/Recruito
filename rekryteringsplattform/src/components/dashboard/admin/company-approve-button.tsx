"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approveCompany } from "@/lib/actions/admin";

export function CompanyApproveButton({
    companyId,
    approvalStatus,
}: {
    companyId: string;
    approvalStatus: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    if (approvalStatus === "approved") {
        return <Badge variant="outline" className="text-emerald-700 border-emerald-200">Approved</Badge>;
    }
    if (approvalStatus === "suspended" || approvalStatus === "rejected") {
        return <Badge variant="outline" className="text-rose-700 border-rose-200">{approvalStatus}</Badge>;
    }

    const onApprove = () => {
        startTransition(async () => {
            await approveCompany(companyId);
            router.refresh();
        });
    };

    return (
        <Button
            type="button"
            size="sm"
            onClick={onApprove}
            disabled={isPending}
            className="bg-success-500 hover:bg-success-700"
        >
            {isPending ? "..." : "Approve"}
        </Button>
    );
}
