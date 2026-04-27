"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { approveJob } from "@/lib/actions/jobs";

export function ApproveJobButton({ jobId, status }: { jobId: string; status: string }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    if (status !== "pending_approval") {
        return <span className="text-xs text-muted-foreground">—</span>;
    }

    const handleClick = () => {
        setError(null);
        startTransition(async () => {
            const result = await approveJob(jobId);
            if (result?.error) setError(result.error);
        });
    };

    return (
        <div className="flex flex-col gap-1">
            <Button
                size="sm"
                onClick={handleClick}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            >
                <Check className="h-3.5 w-3.5" />
                {isPending ? "Approving…" : "Approve"}
            </Button>
            {error && <span className="text-[10px] text-red-600">{error}</span>}
        </div>
    );
}
