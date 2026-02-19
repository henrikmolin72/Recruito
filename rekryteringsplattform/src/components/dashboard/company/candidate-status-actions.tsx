"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateCandidateStatus } from "@/lib/actions/candidates";
import { Loader2 } from "lucide-react";

export function CandidateStatusActions({
    candidateId,
    jobId,
    currentStatus
}: {
    candidateId: string,
    jobId: string,
    currentStatus: string
}) {
    const [status, setStatus] = useState(currentStatus);
    const [loading, setLoading] = useState(false);

    const handleStatusChange = async (newStatus: string) => {
        setLoading(true);
        setStatus(newStatus);

        const result = await updateCandidateStatus(candidateId, jobId, newStatus);

        if (result.error) {
            // Revert on error (could use toast here)
            console.error(result.error);
            setStatus(currentStatus);
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Status:</span>
            <Select
                value={status}
                onValueChange={handleStatusChange}
                disabled={loading}
            >
                <SelectTrigger className="w-[180px]">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    <SelectValue placeholder="Välj status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="submitted">Inskickad</SelectItem>
                    <SelectItem value="reviewing">Granskas</SelectItem>
                    <SelectItem value="interview">Intervju</SelectItem>
                    <SelectItem value="offer">Erbjudande</SelectItem>
                    <SelectItem value="hired">Anställd</SelectItem>
                    <SelectItem value="rejected">Avböjd</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
