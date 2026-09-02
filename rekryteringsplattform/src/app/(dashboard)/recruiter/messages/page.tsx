import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getConversations, getRecruiterSupportMessagesIfExists } from "@/lib/actions/messages";
import { RecruiterInbox } from "@/components/dashboard/recruiter/recruiter-inbox";
import { getDictionary } from "@/i18n/server";
import { formatDateShort } from "@/lib/utils";

export default async function RecruiterMessagesPage() {
  const conversations = await getConversations();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const dict = await getDictionary();
  const r = dict.recruiter;

  // The Recruito support thread lives on its own page and is excluded from the
  // inbox — surface it here so admin replies are findable from Messages, not
  // only via the bell notification (client report 2026-09-02).
  const supportMessages = (await getRecruiterSupportMessagesIfExists()) ?? [];
  const lastSupport = supportMessages.length > 0 ? supportMessages[supportMessages.length - 1] : null;

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

      {lastSupport && (
        <Link
          href="/recruiter/messages/support"
          className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4 transition-colors hover:bg-brand-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-brand-900">Kontakta Recruito</p>
              <span className="text-[10px] text-muted-foreground">{formatDateShort(lastSupport.created_at)}</span>
            </div>
            <p className="truncate text-xs italic text-muted-foreground">{lastSupport.content}</p>
          </div>
        </Link>
      )}

      <RecruiterInbox
        initialConversations={conversations}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}
