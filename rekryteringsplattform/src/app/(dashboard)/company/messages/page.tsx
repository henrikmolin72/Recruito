import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Send } from "lucide-react";

const MOCK_CONVERSATIONS = [
  { id: 1, name: "Erik Lindgren", role: "Rekryterare", lastMessage: "Jag har en kandidat som passar perfekt!", time: "14:30", unread: 2 },
  { id: 2, name: "Anna Svensson", role: "Rekryterare", lastMessage: "Kandidaten kan intervjuas nästa vecka", time: "Igår", unread: 0 },
  { id: 3, name: "Karl Pettersson", role: "Rekryterare", lastMessage: "Tack för feedbacken!", time: "Mån", unread: 0 },
];

const MOCK_MESSAGES = [
  { id: 1, sender: "Erik Lindgren", text: "Hej! Jag har hittat en kandidat som matchar er Frontend-roll perfekt.", time: "14:20", isMine: false },
  { id: 2, sender: "Du", text: "Spännande! Berätta mer om kandidatens bakgrund.", time: "14:25", isMine: true },
  { id: 3, sender: "Erik Lindgren", text: "Jag har en kandidat som passar perfekt! 8 års erfarenhet med React och Next.js, har jobbat på Spotify och Klarna.", time: "14:30", isMine: false },
];

export default function CompanyMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meddelanden</h1>
        <p className="text-muted-foreground">Kommunicera med rekryterare</p>
      </div>

      <Card className="h-[600px] flex overflow-hidden">
        {/* Conversation list */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <Input placeholder="Sök konversationer..." />
          </div>
          <div className="flex-1 overflow-y-auto">
            {MOCK_CONVERSATIONS.map((conv) => (
              <div key={conv.id} className={`flex items-center gap-3 p-4 hover:bg-muted cursor-pointer border-b border-border ${conv.id === 1 ? "bg-brand-50" : ""}`}>
                <Avatar initials={conv.name.split(" ").map(n => n[0]).join("")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{conv.name}</p>
                    <span className="text-xs text-muted-foreground">{conv.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="h-5 w-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">
                    {conv.unread}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Avatar initials="EL" />
            <div>
              <p className="font-medium text-sm">Erik Lindgren</p>
              <p className="text-xs text-muted-foreground">Rekryterare — Senior Frontend-utvecklare</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {MOCK_MESSAGES.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-lg p-3 ${msg.isMine ? "bg-brand-600 text-white" : "bg-muted"}`}>
                  <p className="text-sm">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.isMine ? "text-brand-200" : "text-muted-foreground"}`}>{msg.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-border flex gap-2">
            <Input placeholder="Skriv ett meddelande..." className="flex-1" />
            <Button size="md" className="gap-2"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
