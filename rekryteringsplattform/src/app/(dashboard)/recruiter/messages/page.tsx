import { EmptyState } from "@/components/shared/empty-state";
import { MessageSquare } from "lucide-react";

export default function RecruiterMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meddelanden</h1>
        <p className="text-muted-foreground">Kommunicera med företag om dina kandidater</p>
      </div>
      <EmptyState
        icon={<MessageSquare className="size-10" />}
        title="Inga meddelanden"
        description="Meddelanden med företag visas här."
      />
    </div>
  );
}
