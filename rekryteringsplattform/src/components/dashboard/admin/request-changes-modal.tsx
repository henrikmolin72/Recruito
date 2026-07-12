"use client";

import { useState } from "react";
import { requestJobChanges } from "@/lib/actions/admin";
import { useTranslations } from "@/i18n/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
    jobId: string;
}

export function RequestChangesModal({ jobId }: Props) {
    const { t } = useTranslations();
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    async function handleSubmit() {
        if (!note.trim()) {
            toast.error(t("admin.requestChangesNoteLabel"));
            return;
        }
        setBusy(true);
        const r = await requestJobChanges(jobId, note.trim());
        setBusy(false);
        if (r?.error) {
            toast.error(r.error);
        } else {
            toast.success(t("admin.requestChangesSubmit"));
            setNote("");
            setOpen(false);
        }
    }

    return (
        <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setOpen(true)}>
                {t("admin.requestChangesButton")}
            </Button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-[420px] max-w-[90vw] space-y-4">
                        <h3 className="font-bold text-lg">{t("admin.requestChangesTitle")}</h3>
                        <label className="block space-y-1">
                            <span className="text-xs font-semibold uppercase text-slate-500">
                                {t("admin.requestChangesNoteLabel")}
                            </span>
                            <textarea
                                className="w-full rounded border border-slate-200 p-2 min-h-[100px]"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </label>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                                {t("admin.requestChangesCancel")}
                            </Button>
                            <Button onClick={handleSubmit} disabled={busy}>
                                {t("admin.requestChangesSubmit")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
