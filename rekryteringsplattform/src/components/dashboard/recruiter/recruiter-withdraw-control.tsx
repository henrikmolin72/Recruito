"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { withdrawCandidate } from "@/lib/actions/candidates";
import { CANDIDATE_WITHDRAW_REASONS } from "@/lib/candidate-workflow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut } from "lucide-react";

// Recruiter-facing candidate actions are read-only for stage progression — only
// the company/admin advance a candidate. Withdrawing their own candidate is the
// recruiter's one remaining mutating action, so it lives in its own card.
export function RecruiterWithdrawControl({
    candidateId,
    jobId,
    dict: r,
}: {
    candidateId: string;
    jobId: string;
    dict: Record<string, string>;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [withdrawReason, setWithdrawReason] = useState<string>("");

    const withdraw = () => {
        setError(null);
        setSuccess(null);
        startTransition(async () => {
            const result = await withdrawCandidate(candidateId, jobId, withdrawReason);
            if (!result?.success) {
                setError(result?.error || r.pipelineUpdateError || "Kunde inte uppdatera kandidaten.");
                return;
            }
            setSuccess(r.pipelineWithdrawnSuccess || "Kandidaten drogs tillbaka.");
            router.refresh();
        });
    };

    return (
        <Card className="border-none shadow-xl shadow-rose-100/40 bg-gradient-to-br from-rose-50/60 to-white">
            <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white border border-rose-200 text-rose-700 flex items-center justify-center">
                        <LogOut className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-700/70">
                            {r.withdrawCandidate || "Dra tillbaka kandidat"}
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                        value={withdrawReason}
                        onValueChange={setWithdrawReason}
                        disabled={isPending}
                    >
                        <SelectTrigger className="sm:flex-1">
                            <SelectValue placeholder={r.pipelineSelectReason || "Välj anledning"} />
                        </SelectTrigger>
                        <SelectContent>
                            {CANDIDATE_WITHDRAW_REASONS.map((reason) => (
                                <SelectItem key={reason.key} value={reason.key}>
                                    {reason.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isPending || !withdrawReason}
                        onClick={withdraw}
                        className="sm:min-w-[220px] text-rose-700 border-rose-200 hover:bg-rose-50"
                    >
                        {isPending ? (r.updating || "Uppdaterar...") : (r.withdrawCandidate || "Dra tillbaka kandidat")}
                    </Button>
                </div>

                {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                {success && <p className="text-xs text-emerald-700 font-medium">{success}</p>}
            </CardContent>
        </Card>
    );
}
