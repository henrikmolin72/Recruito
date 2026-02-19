import { createClient } from "@/lib/supabase/server";
import { getConversations } from "@/lib/actions/messages";
import { RecruiterInbox } from "@/components/dashboard/recruiter/recruiter-inbox";

export default async function RecruiterMessagesPage() {
  const conversations = await getConversations();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meddelanden</h1>
        <p className="text-muted-foreground">Hantera dina konversationer med kunder</p>
      </div>

      <RecruiterInbox
        initialConversations={conversations}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}
