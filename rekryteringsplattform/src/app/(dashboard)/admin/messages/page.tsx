import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { getRecruitoConversationsForAdmin } from "@/lib/actions/admin-messages";

export default async function AdminMessagesPage() {
    const conversations = await getRecruitoConversationsForAdmin();

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
                            key={c.candidateId}
                            href={`/admin/messages/${c.candidateId}`}
                            className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                        >
                            <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                    {c.candidateName}
                                    {c.companyName && (
                                        <span className="font-normal text-slate-400"> · {c.companyName}</span>
                                    )}
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
