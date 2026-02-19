import { getConversations } from "@/lib/actions/messages";
import { CompanyInbox } from "@/components/dashboard/company/company-inbox";
import { createClient } from "@/lib/supabase/server";

export default async function CompanyMessagesPage() {
  const conversations = await getConversations();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meddelanden</h1>
        <p className="text-muted-foreground">Kommunicera direkt med rekryterare angående dina kandidater</p>
      </div>

      <CompanyInbox
        initialConversations={conversations}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}
