"use client";

import { useState } from "react";
import { clientApproveProposedFee, clientRejectProposedFee } from "@/lib/actions/jobs";
import { useTranslations } from "@/i18n/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { ClientFeeUpliftReason } from "@/types/db-types";

interface Props {
    jobId: string;
    estimated: number;
    proposed: number;
    currency: string;
    reason: ClientFeeUpliftReason | null;
    note: string | null;
}

export function FeeReconfirmCard({ jobId, estimated, proposed, currency, reason, note }: Props) {
    const { t } = useTranslations();
    const [busy, setBusy] = useState(false);
    const delta = proposed - estimated;
    const pct = estimated > 0 ? Math.round((delta / estimated) * 100) : 0;

    async function approve() {
        setBusy(true);
        const r = await clientApproveProposedFee(jobId);
        setBusy(false);
        if (r?.error) toast.error(r.error);
        else toast.success(t("feeReconfirm.cardApproved"));
    }
    async function reject() {
        setBusy(true);
        const r = await clientRejectProposedFee(jobId);
        setBusy(false);
        if (r?.error) toast.error(r.error);
        else toast.success(t("feeReconfirm.cardRejected"));
    }

    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 space-y-4">
            <h3 className="font-bold text-lg text-amber-900">{t("feeReconfirm.cardTitle")}</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">{t("feeReconfirm.cardOriginal")}</p>
                    <p className="font-bold">{formatCurrency(estimated, currency)}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">{t("feeReconfirm.cardProposed")}</p>
                    <p className="font-bold text-amber-700">{formatCurrency(proposed, currency)}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">{t("feeReconfirm.cardDelta")}</p>
                    <p className="font-bold">+{formatCurrency(delta, currency)} ({pct}%)</p>
                </div>
            </div>
            {reason && (
                <div className="text-sm">
                    <p className="text-xs uppercase tracking-wider text-slate-500">{t("feeReconfirm.cardReason")}</p>
                    <p>{t(`feeReconfirm.reason.${reason}`)}</p>
                </div>
            )}
            {note && (
                <div className="text-sm">
                    <p className="text-xs uppercase tracking-wider text-slate-500">{t("feeReconfirm.cardNote")}</p>
                    <p className="whitespace-pre-line">{note}</p>
                </div>
            )}
            <div className="flex gap-2 pt-2">
                <Button onClick={approve} disabled={busy}>{t("feeReconfirm.cardApprove")}</Button>
                <Button variant="outline" onClick={reject} disabled={busy}>{t("feeReconfirm.cardReject")}</Button>
            </div>
        </div>
    );
}
