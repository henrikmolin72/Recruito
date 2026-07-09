"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    sendPlacementInvoice,
    recordPlacementPayment,
    reportGuaranteeFailure,
    completeGuarantee,
    processGuaranteeExpirations,
    setPlacementJoiningDate,
} from "@/lib/actions/placements";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FileText, CreditCard, AlertTriangle, CheckCircle2, Clock, Pencil, Check, X } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { formatDate } from "@/lib/utils";

interface PlacementActionButtonsProps {
    placementId: string;
    status: string;
}

export function PlacementActionButtons({ placementId, status }: PlacementActionButtonsProps) {
    const router = useRouter();
    const { t } = useTranslations();
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
                case "guarantee_complete":
                    result = await completeGuarantee(placementId);
                    break;
            }
        } catch {
            toast.error(t("admin.placementErrorOccurred"));
            setLoading(null);
            return;
        }

        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success(t("admin.placementActionDone"));
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
                    {loading === "send_invoice" ? "..." : t("admin.placementInvoice")}
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
                    {loading === "record_payment" ? "..." : t("admin.placementPayment")}
                </Button>
            )}
            {status === "guarantee_active" && (
                <>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        disabled={loading !== null}
                        onClick={() => handleAction("guarantee_complete")}
                    >
                        <CheckCircle2 className="h-3 w-3" />
                        {loading === "guarantee_complete" ? "..." : t("admin.placementGuaranteeCompleted")}
                    </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        className="h-7 text-xs gap-1"
                        disabled={loading !== null}
                        onClick={() => handleAction("guarantee_failure")}
                    >
                        <AlertTriangle className="h-3 w-3" />
                        {loading === "guarantee_failure" ? "..." : t("admin.placementFailed")}
                    </Button>
                </>
            )}
        </div>
    );
}

interface JoiningDateCellProps {
    placementId: string;
    joiningDate: string | null;
    /** Editable until the placement reaches a terminal state. */
    locked: boolean;
}

/**
 * Inline editor for the client-confirmed joining date. Guarantee Ends is
 * auto-computed from the job's guarantee period; the optional end field
 * overrides it (client request: "OR we can enter the end date manually").
 */
export function JoiningDateCell({ placementId, joiningDate, locked }: JoiningDateCellProps) {
    const router = useRouter();
    const { t } = useTranslations();
    const [editing, setEditing] = useState(false);
    const [joining, setJoining] = useState(joiningDate ?? "");
    const [endOverride, setEndOverride] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        if (!joining) return;
        setSaving(true);
        try {
            const result = await setPlacementJoiningDate(placementId, joining, endOverride || undefined);
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success(t("admin.placementActionDone"));
                setEditing(false);
                router.refresh();
            }
        } catch {
            toast.error(t("admin.placementErrorOccurred"));
        }
        setSaving(false);
    }

    if (!editing) {
        return (
            <div className="flex items-center gap-1.5">
                {joiningDate ? (
                    <span>{formatDate(joiningDate)}</span>
                ) : (
                    <span className="text-amber-600 font-medium">{t("admin.placementAwaitingJoining")}</span>
                )}
                {!locked && (
                    <button
                        type="button"
                        className="text-slate-400 hover:text-slate-700 transition-colors"
                        title={t("admin.placementSetJoiningDate")}
                        onClick={() => setEditing(true)}
                    >
                        <Pencil className="h-3 w-3" />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 flex-wrap">
            <input
                type="date"
                value={joining}
                onChange={(e) => setJoining(e.target.value)}
                className="h-7 rounded border border-border bg-white px-1.5 text-xs"
                aria-label={t("admin.placementSetJoiningDate")}
            />
            <input
                type="date"
                value={endOverride}
                onChange={(e) => setEndOverride(e.target.value)}
                className="h-7 rounded border border-border bg-white px-1.5 text-xs"
                aria-label={t("admin.placementEndDateOptional")}
                title={t("admin.placementEndDateOptional")}
            />
            <Button size="sm" variant="outline" className="h-7 px-2" disabled={saving || !joining} onClick={handleSave}>
                <Check className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" disabled={saving} onClick={() => setEditing(false)}>
                <X className="h-3 w-3" />
            </Button>
        </div>
    );
}

export function ProcessGuaranteeButton() {
    const router = useRouter();
    const { t } = useTranslations();
    const [loading, setLoading] = useState(false);

    async function handleProcess() {
        setLoading(true);
        try {
            const result = await processGuaranteeExpirations();
            toast.success(t("admin.placementGuaranteesProcessed").replace("{n}", String(result?.processed || 0)));
            router.refresh();
        } catch {
            toast.error(t("admin.placementErrorOccurred"));
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
            {loading ? t("admin.placementProcessing") : t("admin.placementProcessGuarantees")}
        </Button>
    );
}
