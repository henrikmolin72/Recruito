"use server"

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications/create";

// The thread types this module reads/writes. 'client' is the company↔recruiter
// thread; the two 'recruito_*' types are the PRIVATE per-party Recruito/admin
// threads introduced by migration 060.
type ConversationType = 'client' | 'recruito_company' | 'recruito_recruiter';

// Unwrap a Supabase nested-relation that the typings model as `T | T[]`. PostgREST
// returns an array for some embedded relations and a single object for others;
// this normalizes to the first element (or undefined) so call sites don't repeat
// `Array.isArray(x) ? x[0] : x`.
function firstOf<T>(rel: T | T[] | null | undefined): T | undefined {
    if (Array.isArray(rel)) return rel[0];
    return rel ?? undefined;
}

// Resolve a candidate's recruiter + company user_ids (and the job id) via the
// user-scoped client. Used by the send actions for the IDOR authorization check.
async function resolveCandidateParties(
    supabase: Awaited<ReturnType<typeof createClient>>,
    candidateId: string,
): Promise<
    | { recruiterUserId?: string; companyUserId?: string; jobId?: string; mandateId: string | null }
    | null
> {
    const { data: candidate, error } = await supabase
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

    if (error || !candidate) return null;

    const recruiter = firstOf((candidate as any).recruiter);
    const job = firstOf((candidate as any).job);
    const company = firstOf(job?.company);

    return {
        recruiterUserId: recruiter?.user_id,
        companyUserId: company?.user_id,
        jobId: job?.id,
        mandateId: ((candidate as any).mandate_id as string | null) ?? null,
    };
}

// Idempotently look up (or create) a conversation by (candidate_id,
// conversation_type) via the service-role client, then seed the given
// participant rows. A UNIQUE(candidate_id, conversation_type) index exists
// (migration 060), so a concurrent insert is resolved by re-selecting the
// winning row. Authorization MUST be enforced by the caller before this runs.
async function getOrCreateConversation({
    candidateId,
    conversationType,
    jobId,
    participantUserIds,
}: {
    candidateId: string;
    conversationType: ConversationType;
    jobId: string | null;
    participantUserIds: string[];
}): Promise<{ id: string } | { error: string }> {
    const supabaseAdmin = createAdminClient();

    const { data: existing } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("candidate_id", candidateId)
        .eq("conversation_type", conversationType)
        .maybeSingle();

    let conversationId = existing?.id as string | undefined;

    if (!conversationId) {
        // Service role: the conversations SELECT policy hides the row from a
        // non-participant, so an RLS insert().select() can't read it back.
        const { data: newConv, error: convError } = await supabaseAdmin
            .from("conversations")
            .insert({ candidate_id: candidateId, job_id: jobId, conversation_type: conversationType })
            .select("id")
            .single();

        if (convError || !newConv) {
            // A concurrent insert may have won the UNIQUE(candidate_id,
            // conversation_type) race — re-select the existing row instead of erroring.
            const { data: raced } = await supabaseAdmin
                .from("conversations")
                .select("id")
                .eq("candidate_id", candidateId)
                .eq("conversation_type", conversationType)
                .maybeSingle();
            if (raced?.id) {
                conversationId = raced.id;
            } else {
                if (convError) console.error("Failed to create conversation:", convError);
                return { error: "Kunde inte skapa konversation." };
            }
        } else {
            conversationId = newConv.id;
        }
    }

    const participantRows = [...new Set(participantUserIds.filter(Boolean))].map((uid) => ({
        conversation_id: conversationId as string,
        user_id: uid,
    }));

    if (participantRows.length) {
        const { error: partErr } = await supabaseAdmin
            .from("conversation_participants")
            .upsert(participantRows, { onConflict: "conversation_id,user_id", ignoreDuplicates: true });
        if (partErr) {
            console.error("Failed to ensure participants:", partErr);
            return { error: "Kunde inte uppdatera konversation." };
        }
    }

    return { id: conversationId as string };
}

export async function getCandidateConversation(candidateId: string, conversationType: ConversationType = 'client') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const supabaseAdmin = createAdminClient();

    // --- Authorization guard (IDOR / CQ2) -----------------------------------
    // The caller must be either an admin (reads all threads) or the party that
    // owns this thread (the candidate's company/recruiter, per the resolution
    // used by the send actions). Privacy of the recruito_* threads is enforced
    // by single-party participation, so an unauthorized caller must get null.
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
    const isAdmin = (profile as any)?.role === "admin";

    if (!isAdmin) {
        const parties = await resolveCandidateParties(supabase, candidateId);
        if (!parties) return null;
        const { recruiterUserId, companyUserId } = parties;

        // 'client' is shared by both parties; the recruito_* threads belong to a
        // single party. Confirm the caller is the appropriate owner.
        const isCompany = user.id === companyUserId;
        const isRecruiter = user.id === recruiterUserId;
        const authorized =
            conversationType === 'client'
                ? isCompany || isRecruiter
                : conversationType === 'recruito_company'
                    ? isCompany
                    : /* recruito_recruiter */ isRecruiter;
        if (!authorized) return null;
    }

    // Read the conversation + messages via the service-role client so the
    // sender-name resolution below isn't blocked by the RLS-scoped profiles
    // join (Arch3 — that join returns null when the caller can't read the other
    // party's profile, which is exactly the "Unknown" bug).
    const { data: conversation, error } = await supabaseAdmin
        .from("conversations")
        .select("id, candidate_id, job_id, conversation_type, created_at")
        .eq("candidate_id", candidateId)
        .eq("conversation_type", conversationType)
        .maybeSingle();

    if (error || !conversation) {
        if (error) console.warn("Could not fetch conversation for candidate:", candidateId, JSON.stringify(error));
        return null;
    }

    const { data: messageRows, error: messagesError } = await supabaseAdmin
        .from("messages")
        .select("id, content, created_at, sender_id, is_system_message")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });

    if (messagesError) {
        console.warn("Could not fetch messages for conversation:", conversation.id, JSON.stringify(messagesError));
        return { ...conversation, messages: [] };
    }

    const senderIds = [...new Set((messageRows || []).map((m: any) => m.sender_id).filter(Boolean))] as string[];
    const profileMap: Record<string, { full_name: string; role: string }> = {};
    if (senderIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name, role")
            .in("id", senderIds);
        (profiles || []).forEach((p: any) => {
            profileMap[p.id] = { full_name: p.full_name || "", role: p.role || "" };
        });
    }

    const messages = (messageRows || []).map((m: any) => ({
        id: m.id,
        content: m.content,
        created_at: m.created_at,
        sender_id: m.sender_id,
        is_system_message: !!m.is_system_message,
        sender: m.sender_id ? profileMap[m.sender_id] || undefined : undefined,
    }));

    return { ...conversation, messages };
}

export async function sendRecruitorMessage(candidateId: string, jobId: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const normalizedContent = content.trim();
    if (!user || !normalizedContent) return { error: "Not authenticated" };

    // Authorize the sender against the candidate's recruiter/company (IDOR guard —
    // required because we create the conversation + participants via service role).
    const parties = await resolveCandidateParties(supabase, candidateId);
    if (!parties) return { error: "Candidate not found" };
    const { recruiterUserId, companyUserId } = parties;

    if (user.id !== recruiterUserId && user.id !== companyUserId) {
        return { error: "Not allowed to message in this conversation" };
    }

    // PRIVACY FIX: route to the sender's OWN private Recruito thread and seed
    // ONLY the sender as participant. The company and the recruiter each have a
    // separate, single-party thread with Recruito/admins — they never share one.
    const isCompany = user.id === companyUserId;
    const conversationType: ConversationType = isCompany ? "recruito_company" : "recruito_recruiter";

    const conv = await getOrCreateConversation({
        candidateId,
        conversationType,
        jobId: parties.jobId ?? jobId ?? null,
        participantUserIds: [user.id],
    });
    if ("error" in conv) return { error: conv.error };

    const { error: msgError } = await supabase
        .from("messages")
        .insert({ conversation_id: conv.id, sender_id: user.id, content: normalizedContent });

    if (msgError) {
        // Map raw DB error to a generic message (no schema leakage).
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

    const nowIso = new Date().toISOString();

    // Resolve the expected conversation participants from the candidate/job relationship.
    const parties = await resolveCandidateParties(supabase, candidateId);
    if (!parties) return { error: "Candidate not found" };

    const { recruiterUserId, companyUserId, mandateId } = parties;
    const resolvedJobId = parties.jobId || jobId;

    if (!recruiterUserId || !companyUserId) {
        return { error: "Could not determine conversation participants" };
    }

    if (user.id !== recruiterUserId && user.id !== companyUserId) {
        return { error: "Not allowed to message in this conversation" };
    }

    const otherUserId = user.id === recruiterUserId ? companyUserId : recruiterUserId;

    // Look up / create the shared company↔recruiter thread and self-heal its
    // participant membership. The UNIQUE(candidate_id, conversation_type) index
    // guarantees a single row, so the old limit(2) "multiple conversations"
    // warning is dead code. Authorization is already enforced above.
    const conv = await getOrCreateConversation({
        candidateId,
        conversationType: "client",
        jobId: resolvedJobId,
        participantUserIds: [recruiterUserId, companyUserId],
    });
    if ("error" in conv) return { error: conv.error };

    const conversationData = { id: conv.id };

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
