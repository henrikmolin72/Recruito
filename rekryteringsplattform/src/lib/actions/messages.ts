"use server"

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notifications";

const MESSAGES_PER_PAGE = 50;

export async function getCandidateConversation(candidateId: string, options?: { before?: string; limit?: number }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Försök hitta en existerande konversation för denna kandidat
    const { data: conversation, error } = await supabase
        .from("conversations")
        .select("id, job_id, candidate_id, created_at")
        .eq("candidate_id", candidateId)
        .maybeSingle();

    if (error || !conversation) {
        if (error) console.warn("Could not fetch conversation for candidate:", candidateId, JSON.stringify(error));
        return null;
    }

    // Fetch messages with pagination
    const limit = options?.limit ?? MESSAGES_PER_PAGE;
    let msgQuery = supabase
        .from("messages")
        .select(`
            *,
            sender:profiles (
                full_name,
                role
            )
        `)
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(limit + 1); // fetch one extra to detect if more exist

    if (options?.before) {
        msgQuery = msgQuery.lt("created_at", options.before);
    }

    const { data: messages, error: msgError } = await msgQuery;

    if (msgError) {
        console.warn("Could not fetch messages:", JSON.stringify(msgError));
        return { ...conversation, messages: [], hasMore: false };
    }

    const hasMore = (messages || []).length > limit;
    const pagedMessages = (messages || []).slice(0, limit).reverse(); // oldest first for display

    return {
        ...conversation,
        messages: pagedMessages,
        hasMore,
    };
}

export async function sendMessage(candidateId: string, jobId: string, content: string, attachment?: { name: string; url: string; size: number; type: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const normalizedContent = content.trim();
    if (!user || (!normalizedContent && !attachment)) return { error: "Not authenticated" };

    const supabaseAdmin = createAdminClient();
    const nowIso = new Date().toISOString();

    // Resolve the expected conversation participants from the candidate/job relationship.
    const { data: candidate, error: candError } = await supabase
        .from("candidates")
        .select(`
            mandate_id,
            recruiter:recruiters(user_id),
            job:jobs(
                id,
                company:companies(user_id)
            )
        `)
        .eq("id", candidateId)
        .single();

    if (candError || !candidate) return { error: "Candidate not found" };

    const recruiterRecord = (candidate as any).recruiter;
    const recruiterUserId = Array.isArray(recruiterRecord) ? recruiterRecord[0]?.user_id : recruiterRecord?.user_id;
    const jobRecord = (candidate as any).job;
    const resolvedJob = Array.isArray(jobRecord) ? jobRecord[0] : jobRecord;
    const resolvedJobId = resolvedJob?.id || jobId;
    const companyRecord = resolvedJob?.company;
    const companyUserId = Array.isArray(companyRecord) ? companyRecord[0]?.user_id : companyRecord?.user_id;
    const mandateId = (candidate as any).mandate_id as string | null;

    if (!recruiterUserId || !companyUserId) {
        return { error: "Could not determine conversation participants" };
    }

    if (user.id !== recruiterUserId && user.id !== companyUserId) {
        return { error: "Not allowed to message in this conversation" };
    }

    const otherUserId = user.id === recruiterUserId ? companyUserId : recruiterUserId;

    // Use service role lookup so broken participant rows don't hide an existing conversation via RLS.
    const { data: existingConversations, error: conversationLookupError } = await supabaseAdmin
        .from("conversations")
        .select("id, job_id, candidate_id, created_at")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: true })
        .limit(2);

    if (conversationLookupError) {
        return { error: conversationLookupError.message };
    }

    if ((existingConversations || []).length > 1) {
        console.warn("Multiple conversations found for candidate", candidateId, (existingConversations || []).map((c: any) => c.id));
    }

    let conversationData = (existingConversations || [])[0] as any;

    if (!conversationData) {
        const { data: newConv, error: convError } = await supabase
            .from("conversations")
            .insert({
                candidate_id: candidateId,
                job_id: resolvedJobId
            })
            .select("id, job_id, candidate_id, created_at")
            .single();

        if (convError || !newConv) return { error: convError?.message || "Failed to create conversation" };
        conversationData = newConv;
    }

    // Self-heal participant membership for legacy/broken conversations.
    const participantRows = [
        { conversation_id: conversationData.id, user_id: recruiterUserId },
        { conversation_id: conversationData.id, user_id: companyUserId },
    ];

    const { error: participantEnsureError } = await supabaseAdmin
        .from("conversation_participants")
        .upsert(participantRows, { onConflict: "conversation_id,user_id", ignoreDuplicates: true });

    if (participantEnsureError) {
        return { error: participantEnsureError.message };
    }

    const { error: readUpdateError } = await supabase
        .from("conversation_participants")
        .update({ last_read_at: nowIso })
        .eq("conversation_id", conversationData.id)
        .eq("user_id", user.id);

    if (readUpdateError) {
        return { error: readUpdateError.message };
    }

    const messagePayload: Record<string, unknown> = {
        conversation_id: conversationData.id,
        sender_id: user.id,
        content: normalizedContent || (attachment ? `[${attachment.name}]` : ""),
    };

    if (attachment) {
        messagePayload.attachment_url = attachment.url;
        messagePayload.attachment_name = attachment.name;
        messagePayload.attachment_size = attachment.size;
        messagePayload.attachment_type = attachment.type;
    }

    const { error: msgError } = await supabase
        .from("messages")
        .insert(messagePayload);

    if (msgError) return { error: msgError.message };

    const isCompany = user.user_metadata.role === 'company';
    const link = isCompany ? '/recruiter/messages' : '/company/messages';
    const senderName = user.user_metadata?.full_name || user.email || "okänd användare";

    await createNotification(
        otherUserId,
        `Nytt meddelande från ${senderName}`,
        normalizedContent.length > 50 ? normalizedContent.substring(0, 50) + '...' : normalizedContent,
        link
    );

    revalidatePath(`/company/jobs/${resolvedJobId}/candidates/${candidateId}`);
    revalidatePath("/company/messages");
    revalidatePath("/recruiter/messages");
    if (mandateId) {
        revalidatePath(`/recruiter/mandates/${mandateId}`);
        revalidatePath(`/recruiter/mandates/${mandateId}/candidates/${candidateId}`);
    }

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

    if (partError) {
        console.error("Error fetching conversation participations:", {
            message: partError.message,
            code: (partError as any).code,
            details: (partError as any).details,
            hint: (partError as any).hint,
        });
        return [];
    }

    const myConvIds = participations?.map(p => p.conversation_id) || [];
    if (myConvIds.length === 0) return [];

    const supabaseAdmin = createAdminClient();

    const { data: conversations, error } = await supabaseAdmin
        .from("conversations")
        .select("id, job_id, candidate_id, created_at")
        .in("id", myConvIds);

    if (error) {
        console.error("Error fetching conversations:", JSON.stringify(error));
        return [];
    }

    const candidateIds = [...new Set((conversations || []).map(c => c.candidate_id).filter(Boolean))];
    const jobIds = [...new Set((conversations || []).map(c => c.job_id).filter(Boolean))];

    const { data: candidates, error: candidatesError } = candidateIds.length > 0
        ? await supabaseAdmin
            .from("candidates")
            .select("id, first_name, last_name, job_id, recruiter_id")
            .in("id", candidateIds as string[])
        : { data: [], error: null as any };

    if (candidatesError) {
        console.error("Error fetching conversation candidates:", JSON.stringify(candidatesError));
        return [];
    }

    const derivedJobIds = [...new Set((candidates || []).map((c: any) => c.job_id).filter(Boolean))];
    const allJobIds = [...new Set([...(jobIds as string[]), ...(derivedJobIds as string[])])];

    const { data: jobs, error: jobsError } = allJobIds.length > 0
        ? await supabaseAdmin
            .from("jobs")
            .select("id, title, company_id")
            .in("id", allJobIds)
        : { data: [], error: null as any };

    if (jobsError) {
        console.error("Error fetching conversation jobs:", JSON.stringify(jobsError));
        return [];
    }

    const companyIds = [...new Set((jobs || []).map((j: any) => j.company_id).filter(Boolean))];

    const { data: companies, error: companiesError } = companyIds.length > 0
        ? await supabaseAdmin
            .from("companies")
            .select("id, company_name")
            .in("id", companyIds as string[])
        : { data: [], error: null as any };

    if (companiesError) {
        console.error("Error fetching conversation companies:", JSON.stringify(companiesError));
        return [];
    }

    const { data: messageRows, error: messagesError } = await supabaseAdmin
        .from("messages")
        .select("id, conversation_id, content, created_at, sender_id, is_system_message")
        .in("conversation_id", myConvIds)
        .order("created_at", { ascending: true });

    if (messagesError) {
        console.error("Error fetching conversation messages:", JSON.stringify(messagesError));
        return [];
    }

    // Fetch all participants to resolve the other person's name reliably
    const { data: allParticipants, error: participantsError } = await supabaseAdmin
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", myConvIds);

    if (participantsError) {
        console.error("Error fetching all conversation participants:", JSON.stringify(participantsError));
        return [];
    }

    const participantOtherUserIds = [...new Set(
        (allParticipants || [])
            .filter(p => p.user_id !== user.id)
            .map(p => p.user_id)
    )];

    const messageSenderIds = [...new Set((messageRows || []).map((m: any) => m.sender_id).filter(Boolean))];
    const allProfileIds = [...new Set([...(participantOtherUserIds as string[]), ...(messageSenderIds as string[])])];

    let profileMap: Record<string, string> = {};
    let profileDetailMap: Record<string, { full_name: string; role?: string }> = {};
    if (allProfileIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name, role")
            .in("id", allProfileIds);

        if (profilesError) {
            console.error("Error fetching conversation profiles:", JSON.stringify(profilesError));
            return [];
        }

        (profiles || []).forEach((p: any) => {
            const fullName = p.full_name || "";
            profileMap[p.id] = fullName;
            profileDetailMap[p.id] = { full_name: fullName, role: p.role || undefined };
        });
    }

    const convOtherName: Record<string, string> = {};
    (allParticipants || []).forEach(p => {
        if (p.user_id !== user.id) {
            convOtherName[p.conversation_id] = profileMap[p.user_id] || "";
        }
    });

    const jobMap: Record<string, any> = {};
    (jobs || []).forEach((job: any) => {
        jobMap[job.id] = job;
    });

    const companyMap: Record<string, any> = {};
    (companies || []).forEach((company: any) => {
        companyMap[company.id] = company;
    });

    const candidateMap: Record<string, any> = {};
    (candidates || []).forEach((candidate: any) => {
        const candidateJob = candidate.job_id ? jobMap[candidate.job_id] : null;
        const company = candidateJob?.company_id ? companyMap[candidateJob.company_id] : null;

        candidateMap[candidate.id] = {
            id: candidate.id,
            first_name: candidate.first_name,
            last_name: candidate.last_name,
            job: candidateJob ? {
                id: candidateJob.id,
                title: candidateJob.title,
                company: company ? {
                    id: company.id,
                    company_name: company.company_name,
                } : null,
            } : null,
        };
    });

    const messagesByConversation: Record<string, any[]> = {};
    (messageRows || []).forEach((msg: any) => {
        if (!messagesByConversation[msg.conversation_id]) {
            messagesByConversation[msg.conversation_id] = [];
        }
        messagesByConversation[msg.conversation_id].push({
            id: msg.id,
            content: msg.content,
            created_at: msg.created_at,
            sender_id: msg.sender_id,
            is_system_message: !!msg.is_system_message,
            sender: msg.sender_id ? profileDetailMap[msg.sender_id] || undefined : undefined,
        });
    });

    // Sort messages within each conversation (newest last) and sort conversations by latest message
    const sorted = (conversations || []).map((conv: any) => ({
        ...conv,
        candidate: conv.candidate_id ? candidateMap[conv.candidate_id] || null : null,
        otherParticipantName: convOtherName[conv.id] || "",
        messages: (messagesByConversation[conv.id] || []).sort((a: any, b: any) =>
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

export async function getConversationReadStatus(conversationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const supabaseAdmin = createAdminClient();

    const { data: participants } = await supabaseAdmin
        .from("conversation_participants")
        .select("user_id, last_read_at")
        .eq("conversation_id", conversationId);

    if (!participants) return null;

    const otherParticipant = participants.find(p => p.user_id !== user.id);
    return {
        myLastRead: participants.find(p => p.user_id === user.id)?.last_read_at || null,
        otherLastRead: otherParticipant?.last_read_at || null,
    };
}

export async function uploadMessageAttachment(formData: FormData): Promise<{ url: string; name: string; size: number; type: string } | { error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const file = formData.get("file") as File;
    if (!file) return { error: "No file provided" };

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) return { error: "File too large (max 10 MB)" };

    const ext = file.name.split(".").pop() || "bin";
    const path = `messages/${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file, { contentType: file.type });

    if (uploadError) return { error: uploadError.message };

    const { data: urlData } = supabase.storage
        .from("attachments")
        .getPublicUrl(path);

    return {
        url: urlData.publicUrl,
        name: file.name,
        size: file.size,
        type: file.type,
    };
}
