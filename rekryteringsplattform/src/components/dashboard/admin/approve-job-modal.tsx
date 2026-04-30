"use client";

import { useState } from "react";
import { approveJob } from "@/lib/actions/jobs";
import { requestClientFeeReconfirm } from "@/lib/actions/admin";
import { CLIENT_FEE_UPLIFT_REASONS } from "@/lib/fee-reconfirm";
import type { ClientFeeUpliftReason } from "@/types/db-types";
import { useTranslations } from "@/i18n/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
    jobId: string;
    status: string;
    requiresUplift: boolean;
}

export function ApproveJobModal({ jobId, status, requiresUplift }: Props) {
    const { t } = useTranslations();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<ClientFeeUpliftReason>("hard_to_fill");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    if (status !== "pending_approval") return null;

    async function handlePlainApprove() {
        setBusy(true);
        const r = await approveJob(jobId);
        setBusy(false);
        if (r?.error) toast.error(r.error);
        else toast.success("Approved");
    }

    async function handleUpliftSubmit() {
        if (reason === "custom" && !note.trim()) {
            toast.error(t("feeReconfirm.errors.noteRequiredForCustom"));
            return;
        }
        setBusy(true);
        const r = await requestClientFeeReconfirm(jobId, reason, note.trim() || null);
        setBusy(false);
        if (r?.error) {
            toast.error(r.error);
        } else {
            toast.success("Re-confirmation requested");
            setOpen(false);
        }
    }

    if (!requiresUplift) {
        return (
            <Button size="sm" disabled={busy} onClick={handlePlainApprove}>
                {t("feeReconfirm.adminApproveLabelDefault")}
            </Button>
        );
    }

    return (
        <>
            <Button size="sm" variant="default" disabled={busy} onClick={() => setOpen(true)}>
                {t("feeReconfirm.adminApproveLabelUplift")}
            </Button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-[420px] max-w-[90vw] space-y-4">
                        <h3 className="font-bold text-lg">{t("feeReconfirm.modalTitle")}</h3>
                        <label className="block space-y-1">
                            <span className="text-xs font-semibold uppercase text-slate-500">
                                {t("feeReconfirm.modalReasonLabel")}
                            </span>
                            <select
                                className="w-full rounded border border-slate-200 p-2"
                                value={reason}
                                onChange={(e) => setReason(e.target.value as ClientFeeUpliftReason)}
                            >
                                {CLIENT_FEE_UPLIFT_REASONS.map((r) => (
                                    <option key={r} value={r}>
                                        {t(`feeReconfirm.reason.${r}`)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block space-y-1">
                            <span className="text-xs font-semibold uppercase text-slate-500">
                                {t("feeReconfirm.modalNoteLabel")}
                            </span>
                            <textarea
                                className="w-full rounded border border-slate-200 p-2 min-h-[80px]"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </label>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                                {t("feeReconfirm.modalCancel")}
                            </Button>
                            <Button onClick={handleUpliftSubmit} disabled={busy}>
                                {t("feeReconfirm.modalSubmit")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
