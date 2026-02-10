"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ConversationWithDetails {
  id: string;
  job_id: string | null;
  candidate_id: string | null;
  created_at: string;
  job_title: string | null;
  other_participant: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  last_message: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
  unread: boolean;
}

export async function getOrCreateConversation(
  jobId: string,
  candidateId: string | null,
  otherUserId: string
): Promise<{ conversationId: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { conversationId: null, error: "Ej inloggad" };
  }

  // Check if a conversation already exists between these two users for this job
  const { data: existingParticipations } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (existingParticipations && existingParticipations.length > 0) {
    const myConversationIds = existingParticipations.map(
      (p) => p.conversation_id
    );

    // Find conversations where the other user is also a participant
    const { data: otherParticipations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myConversationIds);

    if (otherParticipations && otherParticipations.length > 0) {
      const sharedConversationIds = otherParticipations.map(
        (p) => p.conversation_id
      );

      // Check if any of these shared conversations match the job_id
      const { data: matchingConversation } = await supabase
        .from("conversations")
        .select("id")
        .in("id", sharedConversationIds)
        .eq("job_id", jobId)
        .limit(1)
        .single();

      if (matchingConversation) {
        return { conversationId: matchingConversation.id, error: null };
      }
    }
  }

  // No existing conversation found -- create one
  const { data: newConversation, error: convError } = await supabase
    .from("conversations")
    .insert({
      job_id: jobId,
      candidate_id: candidateId,
    })
    .select("id")
    .single();

  if (convError || !newConversation) {
    return {
      conversationId: null,
      error: convError?.message || "Kunde inte skapa konversation",
    };
  }

  // Add both users as participants
  const { error: partError } = await supabase
    .from("conversation_participants")
    .insert([
      { conversation_id: newConversation.id, user_id: user.id },
      { conversation_id: newConversation.id, user_id: otherUserId },
    ]);

  if (partError) {
    return {
      conversationId: null,
      error: partError.message,
    };
  }

  revalidatePath("/company/messages");
  revalidatePath("/recruiter/messages");

  return { conversationId: newConversation.id, error: null };
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Ej inloggad" };
  }

  if (!content.trim()) {
    return { success: false, error: "Meddelandet kan inte vara tomt" };
  }

  // Verify user is a participant in this conversation
  const { data: participant } = await supabase
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!participant) {
    return { success: false, error: "Du har inte tillgang till denna konversation" };
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: content.trim(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Update last_read_at for the sender
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  return { success: true, error: null };
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
}

export async function getConversations(): Promise<ConversationWithDetails[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get all conversations where the current user is a participant
  const { data: participations } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", user.id);

  if (!participations || participations.length === 0) return [];

  const conversationIds = participations.map((p) => p.conversation_id);
  const lastReadMap = new Map(
    participations.map((p) => [p.conversation_id, p.last_read_at])
  );

  // Get conversation details with job info
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, job_id, candidate_id, created_at, job:jobs!job_id(title)")
    .in("id", conversationIds)
    .order("created_at", { ascending: false });

  if (!conversations) return [];

  // Get other participants for all conversations
  const { data: allParticipants } = await supabase
    .from("conversation_participants")
    .select("conversation_id, user_id, profile:profiles!user_id(full_name, avatar_url)")
    .in("conversation_id", conversationIds)
    .neq("user_id", user.id);

  const otherParticipantMap = new Map(
    (allParticipants || []).map((p) => [
      p.conversation_id,
      {
        user_id: p.user_id,
        full_name: (p.profile as unknown as { full_name: string; avatar_url: string | null })?.full_name || "Okand",
        avatar_url: (p.profile as unknown as { full_name: string; avatar_url: string | null })?.avatar_url || null,
      },
    ])
  );

  // Get the last message for each conversation
  const results: ConversationWithDetails[] = [];

  for (const conv of conversations) {
    const { data: lastMsg } = await supabase
      .from("messages")
      .select("content, created_at, sender_id")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const lastRead = lastReadMap.get(conv.id);
    const hasUnread = lastMsg
      ? lastMsg.sender_id !== user.id &&
        (!lastRead || new Date(lastMsg.created_at) > new Date(lastRead))
      : false;

    results.push({
      id: conv.id,
      job_id: conv.job_id,
      candidate_id: conv.candidate_id,
      created_at: conv.created_at,
      job_title: (conv.job as unknown as { title: string })?.title || null,
      other_participant: otherParticipantMap.get(conv.id) || null,
      last_message: lastMsg
        ? {
            content: lastMsg.content,
            created_at: lastMsg.created_at,
            sender_id: lastMsg.sender_id,
          }
        : null,
      unread: hasUnread,
    });
  }

  // Sort by last message time (most recent first)
  results.sort((a, b) => {
    const aTime = a.last_message?.created_at || a.created_at;
    const bTime = b.last_message?.created_at || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return results;
}
