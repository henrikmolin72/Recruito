"use client";

import { useState, useTransition } from "react";
import { markDataRightsRequestComplete } from "@/lib/actions/data-rights";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/client";

type Row = {
    id: string;
    request_type: string;
    status: string;
    subject_user_id: string | null;
    subject_candidate_id: string | null;
    requested_email: string | null;
    reason: string | null;
    created_at: string;
    subject_profile?: { full_name: string | null; email: string | null } | null;
};

export function AdminDataRightsRow({ row }: { row: Row }) {
    const { t } = useTranslations();
    const [isPending, startTransition] = useTransition();
    const [notes, setNotes] = useState("");
    const [decision, setDecision] = useState<"completed" | "rejected" | null>(null);

    function submit(d: "completed" | "rejected") {
        setDecision(d);
        startTransition(async () => {
            const result = await markDataRightsRequestComplete(row.id, d, notes);
            if ("error" in result) {
                toast.error(result.error);
                setDecision(null);
                return;
            }
            toast.success(d === "completed" ? t("admin.dsrMarkedComplete") : t("admin.dsrMarkedRejected"));
        });
    }

    const subjectLabel =
        row.subject_profile?.full_name ||
        row.subject_profile?.email ||
        row.requested_email ||
        row.subject_candidate_id ||
        "—";

    return (
        <tr className="border-b border-gray-200">
            <td className="px-3 py-3 text-sm text-gray-600">
                {new Date(row.created_at).toLocaleString()}
            </td>
            <td className="px-3 py-3 text-sm font-medium text-gray-900">{row.request_type}</td>
            <td className="px-3 py-3 text-sm text-gray-700">{subjectLabel}</td>
            <td className="px-3 py-3 text-sm text-gray-600">{row.reason || "—"}</td>
            <td className="px-3 py-3">
                <div className="space-y-2">
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t("admin.dsrAdminNotesPlaceholder")}
                        rows={2}
                        maxLength={2000}
                        className="block w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => submit("completed")}
                            disabled={isPending}
                            className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                            {isPending && decision === "completed" ? t("admin.saving") : t("admin.dsrMarkComplete")}
                        </button>
                        <button
                            type="button"
                            onClick={() => submit("rejected")}
                            disabled={isPending}
                            className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            {isPending && decision === "rejected" ? t("admin.saving") : t("admin.rejectAction")}
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    );
}
