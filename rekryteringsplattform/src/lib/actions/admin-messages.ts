"use server";

import { requireAdmin } from "./require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { revalidatePath } from "next/cache";

/**
 * Admin inbox for the "Chat with Recruito" threads. Migration 060 split the old
 * shared 'recruito' thread into two PRIVATE per-party threads:
 *   - 'recruito_company'   → the company's private thread with Recruito/admins
 *   - 'recruito_recruiter' → the recruiter's private thread with Recruito/admins
 * A candidate can have one of each, so it appears as two separate inbox rows.
 *
 * Admins are not conversation participants, so these run through the service-role
 * client and are gated by requireAdmin() — the same authorization model the rest of
 * the admin actions use. Reads can't rely on getConversations() (participant-scoped).
 */

// The private per-party Recruito thread types this module reads/writes.
type RecruitoConversationType = "recruito_company" | "recruito_recruiter";
type RecruitoParty = "company" | "recruiter";

// Unwrap a Supabase nested-relation modelled as `T | T[]` (mirrors firstOf in
// messages.ts). PostgREST returns an array for some embedded relations and a
// single object for others.
function firstOf<T>(rel: T | T[] | null | undefined): T | undefined {
    if (Array.isArray(rel)) return rel[0];
    return rel ?? undefined;
}

const partyOf = (type: string): RecruitoParty =>
    type === "recruito_company" ? "company" : "recruiter";

// All thread types the admin inbox surfaces, including the candidate-independent
// recruiter support thread (migration 061).
const ADMIN_THREAD_TYPES = [
    "recruito_company",
    "recruito_recruiter",
    "recruito_recruiter_general",
];

export interface AdminRecruitoConversation {
    /** The conversation row id — used to open candidate-less (support) threads. */
    conversationId: string;
    /** 'candidate' = candidate-keyed thread; 'recruiter_support' = candidate-less. */
    kind: "candidate" | "recruiter_support";
    candidateId: string | null;
    jobId: string | null;
    party: RecruitoParty;
    conversationType: string;
    candidateName: string;
    companyName: string | null;
    /** Display name of the party on the other end (company name or recruiter name). */
    partyName: string | null;
    lastMessage: string | null;
    lastAt: string | null;
    messageCount: number;
}

/** Every private Recruito thread (one row per party thread), newest activity first. */
export async function getRecruitoConversationsForAdmin(): Promise<AdminRecruitoConversation[]> {
    await requireAdmin();
    const sb = createAdminClient();

    const { data, error } = await sb
        .from("conversations")
        .select(`
            id, candidate_id, job_id, conversation_type, owner_user_id,
            candidate:candidates(
                first_name, last_name,
                recruiter:recruiters(profile:profiles!recruiters_user_id_fkey(full_name)),
                job:jobs(company:companies(company_name))
            ),
            messages(content, created_at)
        `)
        .in("conversation_type", ADMIN_THREAD_TYPES);

    if (error || !data) return [];

    // Candidate-less support threads (kind 'recruiter_support') have no candidate
    // join — resolve the owning recruiter's display name from owner_user_id.
    const ownerIds = [...new Set(
        (data as any[])
            .filter((c) => c.conversation_type === "recruito_recruiter_general" && c.owner_user_id)
            .map((c) => c.owner_user_id),
    )] as string[];
    const ownerNames: Record<string, string> = {};
    if (ownerIds.length) {
        const { data: profs } = await sb.from("profiles").select("id, full_name").in("id", ownerIds);
        (profs || []).forEach((p: any) => { ownerNames[p.id] = p.full_name || ""; });
    }

    const rows: AdminRecruitoConversation[] = (data as any[]).map((conv) => {
        const isGeneral = conv.conversation_type === "recruito_recruiter_general";
        const cand = firstOf(conv.candidate);
        const job = firstOf(cand?.job);
        const company = firstOf(job?.company);
        const recruiterProfile = firstOf(firstOf(cand?.recruiter)?.profile);
        const msgs = (conv.messages ?? []) as Array<{ content: string; created_at: string }>;
        const last = msgs.length
            ? msgs.reduce((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? a : b))
            : null;
        const name = cand ? `${cand.first_name ?? ""} ${cand.last_name ?? ""}`.trim() : "";
        const party = partyOf(conv.conversation_type);
        const companyName = company?.company_name ?? null;
        return {
            conversationId: conv.id,
            kind: isGeneral ? "recruiter_support" : "candidate",
            candidateId: conv.candidate_id ?? null,
            jobId: conv.job_id,
            party,
            conversationType: conv.conversation_type,
            candidateName: isGeneral
                ? (ownerNames[conv.owner_user_id] || "Rekryterare")
                : (name || "Unknown candidate"),
            companyName,
            partyName: isGeneral ? null : (party === "company" ? companyName : (recruiterProfile?.full_name ?? null)),
            lastMessage: last?.content ?? null,
            lastAt: last?.created_at ?? null,
            messageCount: msgs.length,
        };
    });

    rows.sort((a, b) => new Date(b.lastAt ?? 0).getTime() - new Date(a.lastAt ?? 0).getTime());
    return rows;
}

export interface AdminThreadMessage {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    is_system_message: boolean;
    sender?: { full_name: string; role: string };
}

export interface AdminRecruitoThread {
    conversationId: string;
    candidateId: string;
    jobId: string | null;
    candidate: { first_name: string; last_name: string; current_title: string; status: string };
    messages: AdminThreadMessage[];
}

/** One private Recruito thread for the admin reply view (service role → sender names resolve). */
export async function getRecruitoThreadForAdmin(
    candidateId: string,
    conversationType: RecruitoConversationType,
): Promise<AdminRecruitoThread | null> {
    await requireAdmin();
    const sb = createAdminClient();

    const { data: conv } = await sb
        .from("conversations")
        .select("id, job_id")
        .eq("candidate_id", candidateId)
        .eq("conversation_type", conversationType)
        .maybeSingle();
    if (!conv) return null;

    const { data: cand } = await sb
        .from("candidates")
        .select("first_name, last_name, current_title, status")
        .eq("id", candidateId)
        .single();

    const { data: msgs } = await sb
        .from("messages")
        .select("id, content, sender_id, created_at, is_system_message, sender:profiles(full_name, role)")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });

    const messages: AdminThreadMessage[] = (msgs ?? []).map((m: any) => ({
        id: m.id,
        content: m.content,
        sender_id: m.sender_id,
        created_at: m.created_at,
        is_system_message: m.is_system_message ?? false,
        sender: m.sender ? (Array.isArray(m.sender) ? m.sender[0] : m.sender) : undefined,
    }));

    return {
        conversationId: conv.id,
        candidateId,
        jobId: conv.job_id,
        candidate: {
            first_name: cand?.first_name ?? "",
            last_name: cand?.last_name ?? "",
            current_title: cand?.current_title ?? "",
            status: cand?.status ?? "",
        },
        messages,
    };
}

/**
 * Admin-scoped poll fetcher for the chat component. Reuses getRecruitoThreadForAdmin
 * so the admin detail view has ONE source of truth for reads (instead of polling the
 * candidate-side getCandidateConversation). Returns just the message list. The wider
 * ConversationType is accepted so a bare reference can satisfy CandidateChat's prop
 * signature; the admin view only ever passes a recruito_* type.
 */
export async function getRecruitoThreadMessagesForAdmin(
    candidateId: string,
    conversationType: "client" | RecruitoConversationType | "recruito_recruiter_general",
): Promise<AdminThreadMessage[]> {
    // This candidate-keyed reader only serves the two per-party threads.
    if (conversationType !== "recruito_company" && conversationType !== "recruito_recruiter") return [];
    const thread = await getRecruitoThreadForAdmin(candidateId, conversationType);
    return thread?.messages ?? [];
}

/**
 * Admin reply into a specific private Recruito thread (company OR recruiter).
 * Signature matches CandidateChat's sendMessageFn plus the target conversationType.
 * Admins aren't participants, so the insert goes through the service-role client;
 * requireAdmin() authorizes it. The thread is created (seeding ONLY the target
 * party as participant) if it doesn't exist, and only that party is notified.
 */
export async function sendAdminMessage(
    candidateId: string,
    jobId: string,
    content: string,
    conversationType: "client" | RecruitoConversationType | "recruito_recruiter_general",
): Promise<{ success?: boolean; error?: string }> {
    const { user } = await requireAdmin();
    const normalizedContent = content.trim();
    if (!normalizedContent) return { error: "Empty message" };
    // The candidate-keyed admin reply only writes to the two per-party threads.
    // Guard the wider type accepted for the CandidateChat prop signature.
    if (conversationType !== "recruito_company" && conversationType !== "recruito_recruiter") {
        return { error: "Invalid thread" };
    }

    const party = partyOf(conversationType);
    const sb = createAdminClient();

    // Resolve the candidate's company/recruiter so we can seed the single correct
    // participant and target the notification at exactly that party.
    const { data: cand } = await sb
        .from("candidates")
        .select("mandate_id, recruiter:recruiters(user_id), job:jobs(company:companies(user_id))")
        .eq("id", candidateId)
        .single();
    const rec = firstOf((cand as any)?.recruiter);
    const job = firstOf((cand as any)?.job);
    const company = firstOf(job?.company);
    const mandateId = ((cand as any)?.mandate_id as string | null) ?? null;
    const partyUserId = (party === "company" ? company?.user_id : rec?.user_id) as string | undefined;

    // If the target party can't be resolved (null user_id / unresolved row), do NOT
    // create an orphan thread the party could never see — bail before any write.
    if (!partyUserId) return { error: "Could not open conversation" };

    let { data: conv } = await sb
        .from("conversations")
        .select("id, job_id")
        .eq("candidate_id", candidateId)
        .eq("conversation_type", conversationType)
        .maybeSingle();

    if (!conv) {
        const { data: newConv, error: convErr } = await sb
            .from("conversations")
            .insert({ candidate_id: candidateId, job_id: jobId || null, conversation_type: conversationType })
            .select("id, job_id")
            .single();
        if (convErr || !newConv) return { error: "Could not open conversation" };
        conv = newConv;

        // Seed ONLY the target party as participant (single-party private thread).
        if (partyUserId) {
            const { error: partErr } = await sb
                .from("conversation_participants")
                .upsert(
                    { conversation_id: conv.id, user_id: partyUserId },
                    { onConflict: "conversation_id,user_id", ignoreDuplicates: true },
                );
            if (partErr) return { error: "Could not open conversation" };
        }
    }

    const { error: msgError } = await sb
        .from("messages")
        .insert({ conversation_id: conv.id, sender_id: user.id, content: normalizedContent });
    if (msgError) return { error: "Could not send message" };

    // Notify ONLY the party this thread belongs to (not both).
    if (partyUserId) {
        const body = normalizedContent.length > 50 ? normalizedContent.slice(0, 50) + "…" : normalizedContent;
        const link =
            party === "company"
                ? conv.job_id
                    ? `/company/jobs/${conv.job_id}/candidates/${candidateId}`
                    : "/company/messages"
                : mandateId
                    ? `/recruiter/mandates/${mandateId}/candidates/${candidateId}`
                    : "/recruiter/messages";
        await createNotification(partyUserId, {
            titleKey: "notif.newMessageTitle",
            params: { sender: "Recruito" },
            body,
            link,
        });
    }

    revalidatePath("/admin/messages");
    revalidatePath(`/admin/messages/${candidateId}`);
    return { success: true };
}

// ---------------------------------------------------------------------------
// Conversation-id-based admin thread access. Used for candidate-less threads
// (the recruiter support thread, migration 061) which the candidate-keyed route
// above cannot open. Also works for any recruito_* thread.
// ---------------------------------------------------------------------------

async function fetchAdminThreadMessages(
    sb: ReturnType<typeof createAdminClient>,
    conversationId: string,
): Promise<AdminThreadMessage[]> {
    const { data: msgs } = await sb
        .from("messages")
        .select("id, content, sender_id, created_at, is_system_message, sender:profiles(full_name, role)")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
    return (msgs ?? []).map((m: any) => ({
        id: m.id,
        content: m.content,
        sender_id: m.sender_id,
        created_at: m.created_at,
        is_system_message: m.is_system_message ?? false,
        sender: m.sender ? (Array.isArray(m.sender) ? m.sender[0] : m.sender) : undefined,
    }));
}

export async function getRecruitoThreadByConversationId(
    conversationId: string,
): Promise<{ conversationId: string; title: string; messages: AdminThreadMessage[] } | null> {
    await requireAdmin();
    const sb = createAdminClient();
    const { data: conv } = await sb
        .from("conversations")
        .select("id, conversation_type, owner_user_id")
        .eq("id", conversationId)
        .maybeSingle();
    if (!conv || !ADMIN_THREAD_TYPES.includes((conv as any).conversation_type)) return null;

    let title = "Recruito-konversation";
    if ((conv as any).owner_user_id) {
        const { data: prof } = await sb
            .from("profiles")
            .select("full_name")
            .eq("id", (conv as any).owner_user_id)
            .maybeSingle();
        title = (prof as any)?.full_name || title;
    }

    return { conversationId: (conv as any).id, title, messages: await fetchAdminThreadMessages(sb, conversationId) };
}

/** Poll fetcher for the conversation-id thread view. Leading args match CandidateChat. */
export async function getRecruitoThreadMessagesByConversationId(
    conversationId: string,
): Promise<AdminThreadMessage[]> {
    await requireAdmin();
    const sb = createAdminClient();
    const { data: conv } = await sb
        .from("conversations")
        .select("conversation_type")
        .eq("id", conversationId)
        .maybeSingle();
    if (!conv || !ADMIN_THREAD_TYPES.includes((conv as any).conversation_type)) return [];
    return fetchAdminThreadMessages(sb, conversationId);
}

/** Admin reply into a thread by conversation id. Signature matches CandidateChat's sendMessageFn. */
export async function sendAdminMessageToConversation(
    conversationId: string,
    _jobId: string,
    content: string,
): Promise<{ success?: boolean; error?: string }> {
    const { user } = await requireAdmin();
    const normalizedContent = content.trim();
    if (!normalizedContent) return { error: "Empty message" };

    const sb = createAdminClient();
    const { data: conv } = await sb
        .from("conversations")
        .select("id, conversation_type, owner_user_id")
        .eq("id", conversationId)
        .maybeSingle();
    if (!conv || !ADMIN_THREAD_TYPES.includes((conv as any).conversation_type)) return { error: "Invalid thread" };

    const { error: msgError } = await sb
        .from("messages")
        .insert({ conversation_id: (conv as any).id, sender_id: user.id, content: normalizedContent });
    if (msgError) return { error: "Could not send message" };

    // Notify the thread owner (recruiter support thread → owner_user_id).
    if ((conv as any).owner_user_id) {
        const body = normalizedContent.length > 50 ? normalizedContent.slice(0, 50) + "…" : normalizedContent;
        await createNotification((conv as any).owner_user_id, {
            titleKey: "notif.newMessageTitle",
            params: { sender: "Recruito" },
            body,
            link: "/recruiter/messages/support",
        });
    }

    revalidatePath(`/admin/messages/thread/${conversationId}`);
    revalidatePath("/admin/messages");
    return { success: true };
}
