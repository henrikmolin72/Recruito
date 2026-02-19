"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { claimMandate } from "@/lib/actions/recruiter";
import { useRouter } from "next/navigation";

export function TakeMandateButton({ jobId }: { jobId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleClaim = async () => {
        setLoading(true);
        const result = await claimMandate(jobId);
        if (result?.error) {
            alert(result.error);
        } else {
            // Success, maybe redirect or just let revalidatePath handle update
            // Router refresh helps to update client cache if revalidatePath isn't enough for client side navigation state
            router.push('/recruiter');
        }
        setLoading(false);
    };

    return (
        <Button
            size="sm"
            className="bg-success-500 hover:bg-success-700 text-white"
            onClick={handleClaim}
            disabled={loading}
        >
            {loading ? "Bearbetar..." : "Ta mandat"}
        </Button>
    );
}
