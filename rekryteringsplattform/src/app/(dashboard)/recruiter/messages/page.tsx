import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

const MOCK_CONVERSATIONS = [
  { id: 1, name: "TechCorp AB", lastMessage: "Berätta mer om kandidatens bakgrund.", time: "14:25", unread: 1 },
  { id: 2, name: "FinanceHQ", lastMessage: "Vi söker gärna fler kandidater", time: "Igår", unread: 0 },
];

export default function RecruiterMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meddelanden</h1>
        <p className="text-muted-foreground">Kommunicera med företag</p>
      </div>

      <Card className="h-[600px] flex overflow-hidden">
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <Input placeholder="Sök konversationer..." />
          </div>
          <div className="flex-1 overflow-y-auto">
            {MOCK_CONVERSATIONS.map((conv) => (
              <div key={conv.id} className={`flex items-center gap-3 p-4 hover:bg-muted cursor-pointer border-b border-border ${conv.id === 1 ? "bg-brand-50" : ""}`}>
                <Avatar initials={conv.name.substring(0, 2)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{conv.name}</p>
                    <span className="text-xs text-muted-foreground">{conv.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="h-5 w-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">{conv.unread}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <p className="font-medium text-sm">TechCorp AB</p>
            <p className="text-xs text-muted-foreground">Senior Frontend-utvecklare</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex justify-end"><div className="max-w-[70%] rounded-lg p-3 bg-brand-600 text-white"><p className="text-sm">Jag har en kandidat som matchar er Frontend-roll perfekt!</p><p className="text-xs mt-1 text-brand-200">14:20</p></div></div>
            <div className="flex justify-start"><div className="max-w-[70%] rounded-lg p-3 bg-muted"><p className="text-sm">Berätta mer om kandidatens bakgrund.</p><p className="text-xs mt-1 text-muted-foreground">14:25</p></div></div>
          </div>
          <div className="p-4 border-t border-border flex gap-2">
            <Input placeholder="Skriv ett meddelande..." className="flex-1" />
            <Button size="md"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
