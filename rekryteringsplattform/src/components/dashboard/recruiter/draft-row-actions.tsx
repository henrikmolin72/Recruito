"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteDraftCandidate } from "@/lib/actions/candidates-extended";
import { useTranslations } from "@/i18n/client";

export function DraftRowActions({
    mandateId,
    draftId,
    resumeLabel,
    deleteLabel,
    confirmLabel,
}: {
    mandateId: string;
    draftId: string;
    resumeLabel?: string;
    deleteLabel?: string;
    confirmLabel?: string;
}) {
    const router = useRouter();
    const { t } = useTranslations();
    const [isPending, startTransition] = useTransition();
    const resume = resumeLabel ?? t("recruiter.resume");
    const del = deleteLabel ?? t("recruiter.remove");
    const confirmText = confirmLabel ?? t("recruiter.removeDraftConfirm");

    const onDelete = () => {
        if (!confirm(confirmText)) return;
        startTransition(async () => {
            await deleteDraftCandidate(draftId);
            router.refresh();
        });
    };

    return (
        <div className="flex items-center gap-3">
            <Link
                href={`/recruiter/mandates/${mandateId}/candidates/new?draftId=${draftId}`}
                className="text-brand-600 hover:text-brand-700 font-medium"
            >
                {resume}
            </Link>
            <button
                type="button"
                onClick={onDelete}
                disabled={isPending}
                className="text-rose-600 hover:text-rose-700 font-medium disabled:opacity-50"
            >
                {isPending ? "..." : del}
            </button>
        </div>
    );
}
