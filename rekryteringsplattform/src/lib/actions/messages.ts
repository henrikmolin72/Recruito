"use server"

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications/create";

export async function getCandidateConversation(candidateId: string, conversationType: 'client' | 'recruito' = 'client') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

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
        .eq("conversation_type", conversationType)
        .maybeSingle();

    if (error) {
        console.warn("Could not fetch conversation for candidate:", candidateId, JSON.stringify(error));
        return null;
    }

    return conversation;
}

export async function sendRecruitorMessage(candidateId: string, jobId: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const normalizedContent = content.trim();
    if (!user || !normalizedContent) return { error: "Not authenticated" };

    const supabaseAdmin = createAdminClient();

    // Authorize the sender against the candidate's recruiter/company (IDOR guard —
    // required because we create the conversation + participants via service role).
    const { data: candidate, error: candError } = await supabase
        .from("candidates")
        .select(`recruiter:recruiters(user_id), job:jobs(company:companies(user_id))`)
        .eq("id", candidateId)
        .single();
    if (candError || !candidate) return { error: "Candidate not found" };

    const recruiterRecord = (candidate as any).recruiter;
    const recruiterUserId = Array.isArray(recruiterRecord) ? recruiterRecord[0]?.user_id : recruiterRecord?.user_id;
    const jobRecord = (candidate as any).job;
    const resolvedJob = Array.isArray(jobRecord) ? jobRecord[0] : jobRecord;
    const companyRecord = resolvedJob?.company;
    const companyUserId = Array.isArray(companyRecord) ? companyRecord[0]?.user_id : companyRecord?.user_id;

    if (user.id !== recruiterUserId && user.id !== companyUserId) {
        return { error: "Not allowed to message in this conversation" };
    }

    const { data: existingConv } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("candidate_id", candidateId)
        .eq("conversation_type", "recruito")
        .maybeSingle();

    let conversationId = existingConv?.id;

    if (!conversationId) {
        // Service role: the conversations SELECT policy hides the row from a
        // non-participant, so an RLS insert().select() can't read it back.
        const { data: newConv, error: convError } = await supabaseAdmin
            .from("conversations")
            .insert({ candidate_id: candidateId, job_id: jobId, conversation_type: "recruito" })
            .select("id")
            .single();
        if (convError || !newConv) {
            if (convError) console.error("Failed to create recruito conversation:", convError);
            return { error: "Kunde inte skapa konversation." };
        }
        conversationId = newConv.id;
    }

    // Seed participant rows so the message INSERT passes RLS and the human party
    // can read the thread back (Recruito admins read via is_admin()). Previously
    // missing entirely — which is why recruito messages never persisted.
    const participantRows = [recruiterUserId, companyUserId]
        .filter(Boolean)
        .map((uid) => ({ conversation_id: conversationId as string, user_id: uid as string }));
    if (participantRows.length) {
        const { error: partErr } = await supabaseAdmin
            .from("conversation_participants")
            .upsert(participantRows, { onConflict: "conversation_id,user_id", ignoreDuplicates: true });
        if (partErr) {
            console.error("Failed to ensure recruito participants:", partErr);
            return { error: "Kunde inte uppdatera konversation." };
        }
    }

    const { error: msgError } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: user.id, content: normalizedContent });

    if (msgError) {
        console.error("Failed to insert recruiter message:", msgError);
        return { error: "Kunde inte skicka meddelande." };
    }

    return { success: true };
}

export async function sendMessage(candidateId: string, jobId: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const normalizedContent = content.trim();
    if (!user || !normalizedContent) return { error: "Not authenticated" };

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
        .eq("conversation_type", "client")
        .order("created_at", { ascending: true })
        .limit(2);

    if (conversationLookupError) {
        console.error("Failed to look up conversation:", conversationLookupError);
        return { error: "Kunde inte hämta konversation." };
    }

    if ((existingConversations || []).length > 1) {
        console.warn("Multiple conversations found for candidate", candidateId, (existingConversations || []).map((c: any) => c.id));
    }

    let conversationData = (existingConversations || [])[0] as any;

    if (!conversationData) {
        // Create via service role: the conversations SELECT policy only exposes a
        // row to its participants, but participants are seeded below — so an
        // RLS-scoped insert().select() can't read back the row it just created
        // (this was silently failing every first message). Authorization is
        // already enforced above (user ∈ {recruiter, company}).
        const { data: newConv, error: convError } = await supabaseAdmin
            .from("conversations")
            .insert({
                candidate_id: candidateId,
                job_id: resolvedJobId,
                conversation_type: "client"
            })
            .select("id, job_id, candidate_id, created_at")
            .single();

        if (convError || !newConv) {
            if (convError) console.error("Failed to create conversation:", convError);
            return { error: "Kunde inte skapa konversation." };
        }
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
        console.error("Failed to ensure participants:", participantEnsureError);
        return { error: "Kunde inte uppdatera konversation." };
    }

    const { error: readUpdateError } = await supabase
        .from("conversation_participants")
        .update({ last_read_at: nowIso })
        .eq("conversation_id", conversationData.id)
        .eq("user_id", user.id);

    if (readUpdateError) {
        console.error("Failed to update last_read_at:", readUpdateError);
        return { error: "Kunde inte uppdatera lässtatus." };
    }

    const { error: msgError } = await supabase
        .from("messages")
        .insert({
            conversation_id: conversationData.id,
            sender_id: user.id,
            content: normalizedContent
        });

    if (msgError) {
        console.error("Failed to insert message:", msgError);
        return { error: "Kunde inte skicka meddelande." };
    }

    // Derive the sender's side from the DB-resolved conversation participants
    // (user_metadata is client-writable and must not drive routing).
    const isCompany = user.id === companyUserId;
    const link = isCompany ? '/recruiter/messages' : '/company/messages';
    const senderName = user.user_metadata?.full_name || user.email || "okänd användare";

    await createNotification(otherUserId, {
        titleKey: "notif.newMessageTitle",
        params: { sender: senderName },
        body: normalizedContent.length > 50 ? normalizedContent.substring(0, 50) + '...' : normalizedContent,
        link,
    });

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

    const profileMap: Record<string, string> = {};
    const profileDetailMap: Record<string, { full_name: string; role?: string }> = {};
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
