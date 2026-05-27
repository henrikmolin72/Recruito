"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    approveRecruiter,
    rejectRecruiter,
    suspendRecruiter,
    reactivateRecruiter,
    type RecruiterKycChecklist,
} from "@/lib/actions/admin";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/client";
import { toast } from "sonner";

const DEFAULT_CHECKLIST = {
    linkedin_verified: false,
    email_domain_match: false,
    experience_credible: false,
    agreement_signed: false,
};

type ChecklistKey = keyof typeof DEFAULT_CHECKLIST;

const CHECKLIST_LABELS: Record<ChecklistKey, string> = {
    linkedin_verified:
        "LinkedIn-profil besökt och bekräftad — profilen matchar ansökan och visar relevant rekryterings­erfarenhet.",
    email_domain_match:
        "E-postadress kontrollerad — antingen företags­domän som matchar LinkedIn eller verifierad personlig e-post.",
    experience_credible:
        "Erfarenhets­nivå trovärdig — uppgiven bracket stämmer med LinkedIn-profilens omfattning.",
    agreement_signed:
        "Frilansavtal påskrivet under signup (agreement_freelance_recruiter + agreement_commission_after_guarantee).",
};

export function RecruiterApprovalActions({ recruiterId }: { recruiterId: string }) {
    const router = useRouter();
    const { t } = useTranslations();
    const [isPending, startTransition] = useTransition();
    const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
    const [checklist, setChecklist] = useState<typeof DEFAULT_CHECKLIST>(DEFAULT_CHECKLIST);
    const [notes, setNotes] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");

    const allChecked = (Object.keys(DEFAULT_CHECKLIST) as ChecklistKey[]).every((k) => checklist[k]);

    function handleApprove() {
        if (!allChecked) {
            toast.error("Bekräfta alla KYC-kriterier innan godkännande.");
            return;
        }
        startTransition(async () => {
            const payload: RecruiterKycChecklist = {
                linkedin_verified: true,
                email_domain_match: true,
                experience_credible: true,
                agreement_signed: true,
                notes: notes.trim() || undefined,
            };
            const result = await approveRecruiter(recruiterId, payload);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success("Rekryterare godkänd.");
            router.refresh();
        });
    }

    function handleReject() {
        if (!rejectionReason.trim()) {
            toast.error("Ange anledning för avslag.");
            return;
        }
        startTransition(async () => {
            const result = await rejectRecruiter(recruiterId, rejectionReason);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success("Rekryterare avslagen.");
            router.refresh();
        });
    }

    if (mode === "idle") {
        return (
            <div className="flex gap-2">
                <Button
                    size="sm"
                    className="bg-success-500 hover:bg-success-700 h-7 text-xs"
                    onClick={() => setMode("approve")}
                >
                    {t("admin.approveButton")}
                </Button>
                <Button
                    size="sm"
                    variant="danger"
                    className="h-7 text-xs"
                    onClick={() => setMode("reject")}
                >
                    {t("admin.rejectButton")}
                </Button>
            </div>
        );
    }

    if (mode === "approve") {
        return (
            <div className="w-full max-w-xl rounded-md border border-gray-200 bg-white p-4 text-sm shadow-sm">
                <p className="font-semibold text-gray-900">KYC-checklista</p>
                <p className="mt-1 text-xs text-gray-600">
                    Bekräfta alla fyra punkter innan godkännande. Checklistan sparas på rekryterarens profil och i audit-trail.
                </p>
                <ul className="mt-3 space-y-2">
                    {(Object.keys(DEFAULT_CHECKLIST) as ChecklistKey[]).map((key) => (
                        <li key={key}>
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="mt-1"
                                    checked={checklist[key]}
                                    onChange={(e) =>
                                        setChecklist({ ...checklist, [key]: e.target.checked })
                                    }
                                />
                                <span className="text-xs text-gray-800">{CHECKLIST_LABELS[key]}</span>
                            </label>
                        </li>
                    ))}
                </ul>
                <label className="mt-3 block">
                    <span className="text-xs font-medium text-gray-700">Anteckningar (frivilligt)</span>
                    <textarea
                        rows={2}
                        maxLength={2000}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-xs"
                    />
                </label>
                <div className="mt-3 flex gap-2">
                    <Button
                        size="sm"
                        className="bg-success-500 hover:bg-success-700 h-7 text-xs"
                        onClick={handleApprove}
                        disabled={!allChecked || isPending}
                    >
                        {isPending ? "Sparar..." : "Godkänn"}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => { setMode("idle"); setChecklist(DEFAULT_CHECKLIST); setNotes(""); }}
                        disabled={isPending}
                    >
                        Avbryt
                    </Button>
                </div>
            </div>
        );
    }

    // mode === "reject"
    return (
        <div className="w-full max-w-xl rounded-md border border-red-200 bg-red-50 p-4 text-sm">
            <p className="font-semibold text-red-900">Avslå ansökan</p>
            <p className="mt-1 text-xs text-red-800">
                Anledningen sparas på rekryterarens profil och syns för administratörer.
            </p>
            <textarea
                rows={3}
                maxLength={1000}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="T.ex. LinkedIn-profil saknar relevant rekryterings­erfarenhet"
                className="mt-3 block w-full rounded border border-red-300 bg-white px-2 py-1 text-xs"
            />
            <div className="mt-3 flex gap-2">
                <Button
                    size="sm"
                    variant="danger"
                    className="h-7 text-xs"
                    onClick={handleReject}
                    disabled={isPending}
                >
                    {isPending ? "Sparar..." : "Avslå"}
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => { setMode("idle"); setRejectionReason(""); }}
                    disabled={isPending}
                >
                    Avbryt
                </Button>
            </div>
        </div>
    );
}

export function RecruiterManageActions({ recruiterId, status }: { recruiterId: string; status: string }) {
    const router = useRouter();
    const { t } = useTranslations();
    const [isPending, startTransition] = useTransition();

    const handleSuspend = () => {
        if (!confirm(t("admin.confirmSuspendRecruiter"))) return;
        startTransition(async () => {
            const result = await suspendRecruiter(recruiterId);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success("Rekryterare avstängd.");
            router.refresh();
        });
    };

    const handleReactivate = () => {
        startTransition(async () => {
            const result = await reactivateRecruiter(recruiterId);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success("Rekryterare återaktiverad.");
            router.refresh();
        });
    };

    if (status === "approved") {
        return (
            <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-danger-500 hover:text-danger-700"
                onClick={handleSuspend}
                disabled={isPending}
            >
                {isPending ? "..." : t("admin.suspendButton")}
            </Button>
        );
    }

    if (status === "suspended" || status === "rejected") {
        return (
            <Button
                size="sm"
                className="bg-success-500 hover:bg-success-700 h-7 text-xs"
                onClick={handleReactivate}
                disabled={isPending}
            >
                {isPending ? "..." : t("admin.reactivateButton")}
            </Button>
        );
    }

    return null;
}
