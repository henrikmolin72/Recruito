"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import {
    markCandidateRecruitoScreened,
    rejectCandidateAtScreening,
} from "@/lib/actions/candidates";

export function TakeActionButton({
    candidateId,
    alreadyScreened,
    rejected,
}: {
    candidateId: string;
    alreadyScreened: boolean;
    rejected: boolean;
}) {
    const [isPending, startTransition] = useTransition();
    const [resolved, setResolved] = useState<"screened" | "rejected" | null>(
        alreadyScreened ? "screened" : rejected ? "rejected" : null
    );
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);

    if (resolved === "screened") {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Submitted to client
            </span>
        );
    }
    if (resolved === "rejected") {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                <XCircle className="h-3.5 w-3.5" /> Rejected
            </span>
        );
    }

    const submit = () => {
        setError(null);
        startTransition(async () => {
            const result = await markCandidateRecruitoScreened(candidateId);
            if (result?.error) setError(result.error);
            else setResolved("screened");
        });
    };

    const confirmReject = () => {
        setError(null);
        startTransition(async () => {
            const result = await rejectCandidateAtScreening(candidateId, reason);
            if (result?.error) setError(result.error);
            else setResolved("rejected");
        });
    };

    if (rejecting) {
        return (
            <div className="flex flex-col gap-2 min-w-[220px]">
                <Textarea
                    autoFocus
                    rows={2}
                    placeholder="Reason for rejecting (visible to the recruiter)…"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="text-xs"
                />
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="danger"
                        onClick={confirmReject}
                        disabled={isPending || reason.trim().length < 3}
                        className="gap-1.5"
                    >
                        <XCircle className="h-3.5 w-3.5" />
                        {isPending ? "Rejecting…" : "Confirm reject"}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                            setRejecting(false);
                            setReason("");
                            setError(null);
                        }}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                </div>
                {error && <span className="text-[10px] text-red-600">{error}</span>}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={isPending}>
                        {isPending ? "Working…" : "Take action"}
                        <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={submit} className="gap-2 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> Submit to client
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setRejecting(true)}
                        className="gap-2 text-red-600 focus:text-red-600"
                    >
                        <XCircle className="h-4 w-4" /> Reject
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            {error && <span className="text-[10px] text-red-600">{error}</span>}
        </div>
    );
}
