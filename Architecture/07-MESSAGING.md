# STEG 7: Meddelandesystem

## Instruktioner till Claude Code

Bygg realtidsmeddelanden med Supabase Realtime. Konversationer kopplas till jobb + kandidat.

---

## 7.1 Realtime Hook

```typescript
// src/hooks/use-messages.ts
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Hämta befintliga meddelanden
    supabase
      .from("messages")
      .select("*, sender:profiles!sender_id(full_name, avatar_url)")
      .eq("conversation_id", conversationId)
      .order("created_at")
      .then(({ data }) => setMessages(data || []));

    // Prenumerera på nya meddelanden
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("messages")
            .select("*, sender:profiles!sender_id(full_name, avatar_url)")
            .eq("id", payload.new.id)
            .single();
          if (data) setMessages((prev) => [...prev, data]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  return messages;
}
```

## 7.2 Skapa konversation (server action)

```typescript
// src/lib/messaging/actions.ts
"use server";

export async function getOrCreateConversation(
  jobId: string,
  candidateId: string | null,
  otherUserId: string
) {
  const supabase = await createClient();
  const userId = (await supabase.auth.getUser()).data.user?.id;

  // Kolla om konversation redan finns
  const { data: existing } = await supabase
    .from("conversations")
    .select("id, conversation_participants!inner(user_id)")
    .eq("job_id", jobId)
    .then(({ data }) =>
      data?.find((c) =>
        c.conversation_participants.some((p: any) => p.user_id === userId) &&
        c.conversation_participants.some((p: any) => p.user_id === otherUserId)
      )
    );

  if (existing) return existing.id;

  // Skapa ny konversation
  const { data: conv } = await supabase
    .from("conversations")
    .insert({ job_id: jobId, candidate_id: candidateId })
    .select("id")
    .single();

  // Lägg till deltagare
  await supabase.from("conversation_participants").insert([
    { conversation_id: conv!.id, user_id: userId },
    { conversation_id: conv!.id, user_id: otherUserId },
  ]);

  return conv!.id;
}

export async function sendMessage(conversationId: string, content: string) {
  const supabase = await createClient();
  const userId = (await supabase.auth.getUser()).data.user?.id;

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userId,
    content,
  });
}
```

## 7.3 Komponent-struktur

### Meddelandesida (`/company/messages` och `/recruiter/messages`)

```
┌─────────────────────┬──────────────────────────────┐
│ Konversationer       │ Meddelandetråd               │
│                      │                              │
│ ┌─────────────────┐ │  [Jobbtitel] — Kandidatnamn   │
│ │ 🟢 TechCorp     │ │                              │
│ │ Senior Dev      │ │  ┌──────────────────────┐    │
│ │ "Tack för..."   │ │  │ Anna (Rekryterare)   │    │
│ │ 2 min sedan     │ │  │ Hej! Presenterar...  │    │
│ └─────────────────┘ │  │ 14:32                │    │
│                      │  └──────────────────────┘    │
│ ┌─────────────────┐ │                              │
│ │ GreenTech AB    │ │  ┌──────────────────────┐    │
│ │ Data Engineer   │ │  │ Erik (Företag)       │    │
│ │ "Kan vi boka.."│ │  │ Bra! Vi vill boka... │    │
│ │ 1 timme sedan   │ │  │ 14:45                │    │
│ └─────────────────┘ │  └──────────────────────┘    │
│                      │                              │
│                      │ ┌────────────────────┬──┐   │
│                      │ │ Skriv meddelande...│ →│   │
│                      │ └────────────────────┴──┘   │
└─────────────────────┴──────────────────────────────┘
```

### Konversationslistan
- Hämta alla konversationer där user är participant
- Visa: Motpartens namn, jobbtitel, senaste meddelandet, tid
- Oläst-indikator (blå prick) om `last_read_at < senaste meddelandet`
- Klick → ladda meddelandetråden

### Meddelandetråden
- Header: Jobbtitel + kandidatnamn (om kopplat)
- Meddelanden med avatar, namn, tid
- Egna meddelanden högerställda (blå bakgrund)
- Andras meddelanden vänsterställda (grå bakgrund)
- Auto-scroll till botten
- Uppdatera `last_read_at` vid öppning

### Meddelandeinput
- Textarea (expanderbar)
- Send-knapp (Enter = skicka, Shift+Enter = ny rad)
- Disabled state om konversation ej vald

**Gå vidare till:** [08-NOTIFICATIONS.md](./08-NOTIFICATIONS.md)
