"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    sendPlacementInvoice,
    recordPlacementPayment,
    reportGuaranteeFailure,
    processGuaranteeExpirations,
} from "@/lib/actions/placements";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FileText, CreditCard, AlertTriangle, Clock } from "lucide-react";

interface PlacementActionButtonsProps {
    placementId: string;
    status: string;
}

export function PlacementActionButtons({ placementId, status }: PlacementActionButtonsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);

    async function handleAction(action: string) {
        setLoading(action);
        let result: { error?: string; success?: boolean } | undefined;

        try {
            switch (action) {
                case "send_invoice":
                    result = await sendPlacementInvoice(placementId);
                    break;
                case "record_payment":
                    result = await recordPlacementPayment(placementId);
                    break;
                case "guarantee_failure":
                    result = await reportGuaranteeFailure(placementId);
                    break;
            }
        } catch {
            toast.error("Ett fel uppstod");
            setLoading(null);
            return;
        }

        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success("Åtgärden utfördes");
            router.refresh();
        }
        setLoading(null);
    }

    return (
        <div className="flex gap-1">
            {(status === "confirmed") && (
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    disabled={loading !== null}
                    onClick={() => handleAction("send_invoice")}
                >
                    <FileText className="h-3 w-3" />
                    {loading === "send_invoice" ? "..." : "Fakturera"}
                </Button>
            )}
            {status === "invoice_sent" && (
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    disabled={loading !== null}
                    onClick={() => handleAction("record_payment")}
                >
                    <CreditCard className="h-3 w-3" />
                    {loading === "record_payment" ? "..." : "Betalning"}
                </Button>
            )}
            {status === "guarantee_active" && (
                <Button
                    size="sm"
                    variant="danger"
                    className="h-7 text-xs gap-1"
                    disabled={loading !== null}
                    onClick={() => handleAction("guarantee_failure")}
                >
                    <AlertTriangle className="h-3 w-3" />
                    {loading === "guarantee_failure" ? "..." : "Misslyckad"}
                </Button>
            )}
        </div>
    );
}

export function ProcessGuaranteeButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleProcess() {
        setLoading(true);
        try {
            const result = await processGuaranteeExpirations();
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success(`${result?.processed || 0} garantier behandlade`);
                router.refresh();
            }
        } catch {
            toast.error("Ett fel uppstod");
        }
        setLoading(false);
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading}
            onClick={handleProcess}
        >
            <Clock className="h-4 w-4" />
            {loading ? "Behandlar..." : "Processera garantier"}
        </Button>
    );
}
