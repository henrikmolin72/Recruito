import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getConversations } from "@/lib/actions/messages";
import { RecruiterInbox } from "@/components/dashboard/recruiter/recruiter-inbox";
import { getDictionary } from "@/i18n/server";

export default async function RecruiterMessagesPage() {
  const conversations = await getConversations();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const dict = await getDictionary();
  const r = dict.recruiter;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{r.messagesPageTitle}</h1>
          <p className="text-muted-foreground">{r.messagesPageSubtitle}</p>
        </div>
        <Link
          href="/recruiter/messages/support"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <MessageSquare className="h-4 w-4" /> Kontakta Recruito
        </Link>
      </div>

      <RecruiterInbox
        initialConversations={conversations}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}
