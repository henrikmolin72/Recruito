import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/actions/require-admin";
import {
    getRecruitoThreadByConversationId,
    getRecruitoThreadMessagesByConversationId,
    sendAdminMessageToConversation,
} from "@/lib/actions/admin-messages";
import { CandidateChat } from "@/components/shared/candidate-chat";

// Opens a Recruito thread by conversation id — used for candidate-less threads
// (the recruiter support thread, migration 061) that the candidate-keyed route
// cannot reach.
export default async function AdminThreadByIdPage({
    params,
}: {
    params: Promise<{ conversationId: string }>;
}) {
    const { conversationId } = await params;
    const { user } = await requireAdmin();

    const thread = await getRecruitoThreadByConversationId(conversationId);
    if (!thread) notFound();

    return (
        <div className="max-w-3xl space-y-4">
            <Link
                href="/admin/messages"
                className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-700"
            >
                <ArrowLeft className="h-4 w-4" /> Back to messages
            </Link>
            <div className="flex items-center gap-2">
                <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                    Recruiter · Direct
                </span>
                <span className="text-sm font-semibold text-slate-700">{thread.title}</span>
            </div>
            {/* candidateId carries the conversation id for the conversation-id actions. */}
            <CandidateChat
                candidateId={conversationId}
                jobId=""
                initialMessages={thread.messages}
                currentUserId={user.id}
                conversationType="recruito_recruiter_general"
                sendMessageFn={sendAdminMessageToConversation}
                pollFn={getRecruitoThreadMessagesByConversationId}
            />
        </div>
    );
}
