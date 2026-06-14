"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteDraftCandidate } from "@/lib/actions/candidates-extended";

export function DraftRowActions({
    mandateId,
    draftId,
    resumeLabel = "Återuppta",
    deleteLabel = "Ta bort",
    confirmLabel = "Ta bort detta utkast?",
}: {
    mandateId: string;
    draftId: string;
    resumeLabel?: string;
    deleteLabel?: string;
    confirmLabel?: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const onDelete = () => {
        if (!confirm(confirmLabel)) return;
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
                {resumeLabel}
            </Link>
            <button
                type="button"
                onClick={onDelete}
                disabled={isPending}
                className="text-rose-600 hover:text-rose-700 font-medium disabled:opacity-50"
            >
                {isPending ? "..." : deleteLabel}
            </button>
        </div>
    );
}
