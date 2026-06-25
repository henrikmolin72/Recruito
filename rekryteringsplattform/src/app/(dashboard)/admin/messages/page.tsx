import { getRecruitoConversationsForAdmin } from "@/lib/actions/admin-messages";
import { getDictionary } from "@/i18n/server";
import { AdminMessagesList } from "@/components/admin/admin-messages-list";

export default async function AdminMessagesPage() {
    const [conversations, dict] = await Promise.all([
        getRecruitoConversationsForAdmin(),
        getDictionary(),
    ]);

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold">Recruito Messages</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Threads where a company or recruiter is chatting with Recruito. Open one to reply as Recruito.
                </p>
            </div>

            <AdminMessagesList
                initialConversations={conversations}
                labels={{
                    company: dict.admin.messagesPartyCompany,
                    recruiter: dict.admin.messagesPartyRecruiter,
                    emptyTitle: "No Recruito conversations yet",
                    emptyHint: "When a company or recruiter messages Recruito, it appears here.",
                    noMessages: "No messages yet",
                }}
            />
        </div>
    );
}
