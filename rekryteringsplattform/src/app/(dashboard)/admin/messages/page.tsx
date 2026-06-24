import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { getRecruitoConversationsForAdmin } from "@/lib/actions/admin-messages";
import { getDictionary } from "@/i18n/server";

export default async function AdminMessagesPage() {
    const [conversations, dict] = await Promise.all([
        getRecruitoConversationsForAdmin(),
        getDictionary(),
    ]);
    const partyLabel = (party: "company" | "recruiter") =>
        party === "company" ? dict.admin.messagesPartyCompany : dict.admin.messagesPartyRecruiter;

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold">Recruito Messages</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Threads where a company or recruiter is chatting with Recruito. Open one to reply as Recruito.
                </p>
            </div>

            {conversations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center">
                    <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">No Recruito conversations yet</p>
                    <p className="mt-1 text-xs text-slate-400">
                        When a company or recruiter messages Recruito, it appears here.
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                    {conversations.map((c) => (
                        <Link
                            key={`${c.candidateId}-${c.party}`}
                            href={`/admin/messages/${c.candidateId}?party=${c.party}`}
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
                                        {partyLabel(c.party)}
                                    </span>
                                    <span className="truncate">
                                        {c.candidateName}
                                        {c.partyName && (
                                            <span className="font-normal text-slate-400"> · {c.partyName}</span>
                                        )}
                                    </span>
                                </p>
                                <p className="truncate text-sm text-slate-500">
                                    {c.lastMessage ?? "No messages yet"}
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
