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
    type === "recruito_recruiter" ? "recruiter" : "company";

export interface AdminRecruitoConversation {
    candidateId: string;
    jobId: string | null;
    party: RecruitoParty;
    conversationType: RecruitoConversationType;
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
            candidate_id, job_id, conversation_type,
            candidate:candidates(
                first_name, last_name,
                recruiter:recruiters(profile:profiles!recruiters_user_id_fkey(full_name)),
                job:jobs(company:companies(company_name))
            ),
            messages(content, created_at)
        `)
        .in("conversation_type", ["recruito_company", "recruito_recruiter"]);

    if (error || !data) return [];

    const rows: AdminRecruitoConversation[] = data.map((conv: any) => {
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
            candidateId: conv.candidate_id,
            jobId: conv.job_id,
            party,
            conversationType: conv.conversation_type as RecruitoConversationType,
            candidateName: name || "Unknown candidate",
            companyName,
            partyName: party === "company" ? companyName : (recruiterProfile?.full_name ?? null),
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
    conversationType: RecruitoConversationType,
): Promise<{ success?: boolean; error?: string }> {
    const { user } = await requireAdmin();
    const normalizedContent = content.trim();
    if (!normalizedContent) return { error: "Empty message" };

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
                ? `/company/jobs/${conv.job_id}/candidates/${candidateId}`
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
