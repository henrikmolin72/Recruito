"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AddToTalentPoolButtonProps {
    candidateId?: string;
    applicationId?: string;
    initialInPool?: boolean;
    className?: string;
}

export function AddToTalentPoolButton({
    candidateId,
    applicationId,
    initialInPool = false,
    className,
}: AddToTalentPoolButtonProps) {
    const [inPool, setInPool] = useState(initialInPool);
    const [loading, setLoading] = useState(false);

    async function handleToggle() {
        if (inPool) return; // no remove from this button — use the pool page
        setLoading(true);
        try {
            const res = await fetch("/api/talent-pool", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ candidateId, applicationId }),
            });
            if (res.ok || res.status === 409) setInPool(true);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={loading || inPool}
            className={cn("gap-2", inPool && "border-green-300 text-green-700 bg-green-50", className)}
        >
            {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : inPool ? (
                <BookmarkCheck className="h-3.5 w-3.5" />
            ) : (
                <Bookmark className="h-3.5 w-3.5" />
            )}
            {inPool ? "In talent pool" : "Save to pool"}
        </Button>
    );
}
