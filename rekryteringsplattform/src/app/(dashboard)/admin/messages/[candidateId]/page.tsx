import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/actions/require-admin";
import { getRecruitoThreadForAdmin, getRecruitoThreadMessagesForAdmin, sendAdminMessage } from "@/lib/actions/admin-messages";
import { CandidateChat } from "@/components/shared/candidate-chat";
import { getDictionary } from "@/i18n/server";

export default async function AdminMessageThreadPage({
    params,
    searchParams,
}: {
    params: Promise<{ candidateId: string }>;
    searchParams: Promise<{ party?: string }>;
}) {
    const { candidateId } = await params;
    const { party } = await searchParams;
    const { user } = await requireAdmin();

    // Which private party thread is this? Default to the company thread for
    // backwards-compatible links that lack the ?party param.
    const isRecruiter = party === "recruiter";
    const conversationType = isRecruiter ? "recruito_recruiter" : "recruito_company";

    const [thread, dict] = await Promise.all([
        getRecruitoThreadForAdmin(candidateId, conversationType),
        getDictionary(),
    ]);
    if (!thread) notFound();

    const partyLabel = isRecruiter
        ? dict.admin.messagesPartyRecruiter
        : dict.admin.messagesPartyCompany;

    return (
        <div className="max-w-3xl space-y-4">
            <Link
                href="/admin/messages"
                className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-700"
            >
                <ArrowLeft className="h-4 w-4" /> Back to messages
            </Link>
            <span
                className={
                    isRecruiter
                        ? "inline-block rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600"
                        : "inline-block rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-600"
                }
            >
                {partyLabel}
            </span>
            <CandidateChat
                candidateId={candidateId}
                jobId={thread.jobId ?? ""}
                initialMessages={thread.messages}
                currentUserId={user.id}
                candidate={thread.candidate}
                conversationType={conversationType}
                sendMessageFn={sendAdminMessage}
                pollFn={getRecruitoThreadMessagesForAdmin}
            />
        </div>
    );
}
