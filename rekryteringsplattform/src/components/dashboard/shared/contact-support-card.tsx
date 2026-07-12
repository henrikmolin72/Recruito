"use client";

import { useState } from "react";
import { CircleHelp, Phone } from "lucide-react";
import { toast } from "sonner";
import { sendSupportRequest } from "@/lib/actions/support";
import { useTranslations } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
    jobId: string;
    jobTitle: string;
}

export function ContactSupportCard({ jobId, jobTitle }: Props) {
    const { t } = useTranslations();
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    async function handleSend() {
        setBusy(true);
        try {
            const result = await sendSupportRequest(jobId, message);
            if ("error" in result) {
                toast.error(t("support.sendFailed"));
                return;
            }
            toast.success(t("support.sent"));
            setOpen(false);
            setMessage("");
        } catch {
            toast.error(t("support.sendFailed"));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <CircleHelp className="h-5 w-5 text-brand-500" />
                    <h3 className="font-bold text-slate-700">{t("support.needHelp")}</h3>
                </div>
                <p className="text-sm text-slate-500">{t("support.helpText")}</p>
            </div>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
                <Phone className="h-4 w-4" /> {t("support.contactSupport")}
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-[440px] max-w-[90vw] space-y-4">
                        <h3 className="font-bold text-lg">{t("support.contactSupport")}</h3>
                        <p className="text-sm text-slate-500">{jobTitle}</p>
                        <label className="block space-y-1">
                            <span className="text-xs font-semibold uppercase text-slate-500">
                                {t("support.messageLabel")}
                            </span>
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={t("support.messagePlaceholder")}
                                className="min-h-[120px]"
                            />
                        </label>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                                {t("support.cancel")}
                            </Button>
                            <Button onClick={handleSend} disabled={busy}>
                                {t("support.send")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
