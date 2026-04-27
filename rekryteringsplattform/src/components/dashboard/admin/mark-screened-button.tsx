"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { markCandidateRecruitoScreened } from "@/lib/actions/candidates";

export function MarkScreenedButton({
    candidateId,
    alreadyScreened,
}: {
    candidateId: string;
    alreadyScreened: boolean;
}) {
    const [isPending, startTransition] = useTransition();
    const [done, setDone] = useState(alreadyScreened);
    const [error, setError] = useState<string | null>(null);

    if (done) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Screened
            </span>
        );
    }

    const handleClick = () => {
        setError(null);
        startTransition(async () => {
            const result = await markCandidateRecruitoScreened(candidateId);
            if (result?.error) setError(result.error);
            else setDone(true);
        });
    };

    return (
        <div className="flex flex-col gap-1">
            <Button
                size="sm"
                variant="outline"
                onClick={handleClick}
                disabled={isPending}
                className="gap-1.5"
            >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isPending ? "Marking…" : "Mark screened"}
            </Button>
            {error && <span className="text-[10px] text-red-600">{error}</span>}
        </div>
    );
}
