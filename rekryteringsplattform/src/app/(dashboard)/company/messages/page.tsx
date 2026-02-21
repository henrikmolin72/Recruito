import { getConversations } from "@/lib/actions/messages";
import { CompanyInbox } from "@/components/dashboard/company/company-inbox";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/server";

export default async function CompanyMessagesPage() {
  const conversations = await getConversations();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const dict = await getDictionary();
  const c = dict.company;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{c.messagesPageTitle}</h1>
        <p className="text-muted-foreground">{c.messagesPageSubtitle}</p>
      </div>

      <CompanyInbox
        initialConversations={conversations}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}
