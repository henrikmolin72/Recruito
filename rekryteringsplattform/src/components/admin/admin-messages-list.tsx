"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import {
    getRecruitoConversationsForAdmin,
    type AdminRecruitoConversation,
} from "@/lib/actions/admin-messages";

interface AdminMessagesListProps {
    initialConversations: AdminRecruitoConversation[];
    labels: {
        company: string;
        recruiter: string;
        emptyTitle: string;
        emptyHint: string;
        noMessages: string;
    };
}

type Tab = "company" | "recruiter";

export function AdminMessagesList({ initialConversations, labels }: AdminMessagesListProps) {
    const [conversations, setConversations] = useState(initialConversations);
    const [tab, setTab] = useState<Tab>("company");

    // Poll the admin inbox so new threads/messages appear without a manual refresh,
    // mirroring the 5s cadence the thread detail view already uses.
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const next = await getRecruitoConversationsForAdmin();
                setConversations(next);
            } catch {
                // Silently ignore polling errors
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const companyCount = conversations.filter((c) => c.party === "company").length;
    const recruiterCount = conversations.filter((c) => c.party === "recruiter").length;
    const visible = conversations.filter((c) => c.party === tab);

    const tabClass = (active: boolean) =>
        active
            ? "rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white"
            : "rounded-full px-4 py-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700";

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => setTab("company")} className={tabClass(tab === "company")}>
                    {labels.company} ({companyCount})
                </button>
                <button type="button" onClick={() => setTab("recruiter")} className={tabClass(tab === "recruiter")}>
                    {labels.recruiter} ({recruiterCount})
                </button>
            </div>

            {visible.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center">
                    <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">{labels.emptyTitle}</p>
                    <p className="mt-1 text-xs text-slate-400">{labels.emptyHint}</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                    {visible.map((c) => (
                        <Link
                            key={c.conversationId}
                            href={
                                c.kind === "recruiter_support"
                                    ? `/admin/messages/thread/${c.conversationId}`
                                    : `/admin/messages/${c.candidateId}?party=${c.party}`
                            }
                            className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                        >
                            <div className="min-w-0">
                                <p className="flex items-center gap-2 truncate font-semibold text-slate-900">
                                    <span
                                        className={
                                            c.party === "company"
                                                ? "shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600"
                                                : "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600"
                                        }
                                    >
                                        {c.party === "company" ? labels.company : labels.recruiter}
                                    </span>
                                    <span className="truncate">
                                        {c.candidateName}
                                        {c.kind === "recruiter_support" ? (
                                            <span className="font-normal text-slate-400"> · Direktkontakt</span>
                                        ) : c.partyName ? (
                                            <span className="font-normal text-slate-400"> · {c.partyName}</span>
                                        ) : null}
                                    </span>
                                </p>
                                <p className="truncate text-sm text-slate-500">
                                    {c.lastMessage ?? labels.noMessages}
                                </p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-xs text-slate-400">
                                    {c.lastAt ? new Date(c.lastAt).toLocaleString() : ""}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    {c.messageCount} message{c.messageCount === 1 ? "" : "s"}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
