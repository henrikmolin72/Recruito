"use server"

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notifications";

export async function getCandidateConversation(candidateId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Försök hitta en existerande konversation för denna kandidat
    const { data: conversation, error } = await supabase
        .from("conversations")
        .select(`
      *,
      messages (
        *,
        sender:profiles (
          full_name,
          role
        )
      )
    `)
        .eq("candidate_id", candidateId)
        .single();

    if (error && error.code !== "PGRST116") { // PGRST116 = Single object not found
        console.error("Error fetching conversation:", error);
        return null;
    }

    return conversation;
}

export async function sendMessage(candidateId: string, jobId: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !content.trim()) return { error: "Not authenticated" };

    // 1. Kontrollera om konversation finns, annars skapa den
    let { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("candidate_id", candidateId)
        .single();

    let conversationData;
    if (!conversation) {
        const { data: candidate, error: candError } = await supabase
            .from("candidates")
            .select("recruiter:recruiters(user_id)")
            .eq("id", candidateId)
            .single();

        if (candError || !candidate) return { error: "Candidate not found" };

        const recruiterRecord = (candidate as any).recruiter;
        const recruiterUserId = Array.isArray(recruiterRecord) ? recruiterRecord[0]?.user_id : recruiterRecord?.user_id;

        if (!recruiterUserId) return { error: "Recruiter not found for this candidate" };

        const { data: newConv, error: convError } = await supabase
            .from("conversations")
            .insert({
                candidate_id: candidateId,
                job_id: jobId
            })
            .select()
            .single();

        if (convError || !newConv) return { error: convError?.message || "Failed to create conversation" };
        conversationData = newConv;

        await supabase.from("conversation_participants").insert([
            { conversation_id: conversationData.id, user_id: user.id, last_read_at: new Date().toISOString() },
            { conversation_id: conversationData.id, user_id: recruiterUserId }
        ]);
    } else {
        conversationData = (conversation as any);
        await supabase.from("conversation_participants")
            .update({ last_read_at: new Date().toISOString() })
            .eq("conversation_id", conversationData.id)
            .eq("user_id", user.id);
    }

    const { error: msgError } = await supabase
        .from("messages")
        .insert({
            conversation_id: conversationData.id,
            sender_id: user.id,
            content: content
        });

    if (msgError) return { error: msgError.message };

    const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationData.id)
        .neq("user_id", user.id);

    if (participants && participants.length > 0) {
        const receiverId = participants[0].user_id;
        const isCompany = user.user_metadata.role === 'company';
        const link = isCompany ? '/recruiter/messages' : '/company/messages';

        await createNotification(
            receiverId,
            `Nytt meddelande från ${user.user_metadata.full_name}`,
            content.length > 50 ? content.substring(0, 50) + '...' : content,
            link
        );
    }

    revalidatePath(`/company/jobs/${jobId}/candidates/${candidateId}`);
    return { success: true };
}

export async function getConversations() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: participations, error: partError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

    if (partError) return [];

    const myConvIds = participations?.map(p => p.conversation_id) || [];
    if (myConvIds.length === 0) return [];

    const { data, error } = await supabase
        .from("conversations")
        .select(`
      *,
      candidate:candidates (
        id,
        first_name,
        last_name,
        recruiter:recruiters (
          id,
          profile:profiles!recruiters_user_id_fkey (
            full_name
          )
        ),
        job:jobs (
          id,
          title,
          company:companies (
            id,
            company_name
          )
        )
      ),
      messages (
        id,
        content,
        created_at,
        sender_id,
        sender:profiles (
          full_name
        )
      )
    `)
        .in("id", myConvIds);

    if (error) {
        console.error("Error fetching conversations:", error);
        return [];
    }

    // Sort messages within each conversation (newest last) and sort conversations by latest message
    const sorted = (data || []).map(conv => ({
        ...conv,
        messages: (conv.messages || []).sort((a: any, b: any) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
    })).sort((a, b) => {
        const aLatest = a.messages[a.messages.length - 1]?.created_at || a.created_at;
        const bLatest = b.messages[b.messages.length - 1]?.created_at || b.created_at;
        return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });

    return sorted;
}

export async function getUnreadMessageCount() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase
        .from("conversation_participants")
        .select(`
      conversation_id,
      last_read_at,
      conversation:conversations (
        messages (
          id,
          created_at,
          sender_id
        )
      )
    `)
        .eq("user_id", user.id);

    if (error) return 0;

    let totalUnread = 0;
    data?.forEach(part => {
        const lastRead = part.last_read_at ? new Date(part.last_read_at) : new Date(0);
        const messages = (part.conversation as any)?.messages || [];
        const unread = messages.filter((m: any) =>
            m.sender_id !== user.id && new Date(m.created_at) > lastRead
        ).length;
        totalUnread += unread;
    });

    return totalUnread;
}

export async function markConversationAsRead(conversationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
}
