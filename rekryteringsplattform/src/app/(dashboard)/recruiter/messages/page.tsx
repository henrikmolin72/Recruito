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
      <div>
        <h1 className="text-2xl font-bold">{r.messagesPageTitle}</h1>
        <p className="text-muted-foreground">{r.messagesPageSubtitle}</p>
      </div>

      <RecruiterInbox
        initialConversations={conversations}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}
