import { createClient } from "@/lib/supabase/server";
import { getConversations } from "@/lib/messaging/actions";
import { MessagingLayout } from "@/components/messaging/messaging-layout";

export default async function RecruiterMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const conversations = await getConversations();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Meddelanden</h1>
        <p className="text-muted-foreground">
          Kommunicera med foretag om dina kandidater
        </p>
      </div>
      <MessagingLayout
        initialConversations={conversations}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}
