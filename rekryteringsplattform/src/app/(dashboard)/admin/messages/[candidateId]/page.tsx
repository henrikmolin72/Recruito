import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/actions/require-admin";
import { getRecruitoThreadForAdmin, sendAdminMessage } from "@/lib/actions/admin-messages";
import { CandidateChat } from "@/components/shared/candidate-chat";

export default async function AdminMessageThreadPage({
    params,
}: {
    params: Promise<{ candidateId: string }>;
}) {
    const { candidateId } = await params;
    const { user } = await requireAdmin();
    const thread = await getRecruitoThreadForAdmin(candidateId);
    if (!thread) notFound();

    return (
        <div className="max-w-3xl space-y-4">
            <Link
                href="/admin/messages"
                className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-700"
            >
                <ArrowLeft className="h-4 w-4" /> Back to messages
            </Link>
            <CandidateChat
                candidateId={candidateId}
                jobId={thread.jobId ?? ""}
                initialMessages={thread.messages}
                currentUserId={user.id}
                candidate={thread.candidate}
                conversationType="recruito_company"
                sendMessageFn={sendAdminMessage}
            />
        </div>
    );
}
