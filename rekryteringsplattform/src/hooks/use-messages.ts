"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_system_message: boolean | null;
  sender?: { full_name: string; avatar_url: string | null };
}

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!conversationId) return;

    // Fetch existing messages
    supabase
      .from("messages")
      .select("*, sender:profiles!sender_id(full_name, avatar_url)")
      .eq("conversation_id", conversationId)
      .order("created_at")
      .then(({ data }) => setMessages((data as unknown as Message[]) || []));

    // Subscribe to new messages via Supabase Realtime
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
          if (data) setMessages((prev) => [...prev, data as unknown as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  return messages;
}
