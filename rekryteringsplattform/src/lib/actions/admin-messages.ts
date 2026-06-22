"use server";

import { requireAdmin } from "./require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { revalidatePath } from "next/cache";

/**
 * Admin inbox for the "Chat with Recruito" threads (conversation_type='recruito').
 *
 * Admins are not conversation participants, so these run through the service-role
 * client and are gated by requireAdmin() — the same authorization model the rest of
 * the admin actions use. Reads can't rely on getConversations() (participant-scoped).
 */

export interface AdminRecruitoConversation {
    candidateId: string;
    jobId: string | null;
    candidateName: string;
    companyName: string | null;
    lastMessage: string | null;
    lastAt: string | null;
    messageCount: number;
}

/** Every 'recruito' conversation, newest activity first. */
export async function getRecruitoConversationsForAdmin(): Promise<AdminRecruitoConversation[]> {
    await requireAdmin();
    const sb = createAdminClient();

    const { data, error } = await sb
        .from("conversations")
        .select(`
            candidate_id, job_id,
            candidate:candidates(first_name, last_name, job:jobs(company:companies(company_name))),
            messages(content, created_at)
        `)
        .eq("conversation_type", "recruito");

    if (error || !data) return [];

    const rows: AdminRecruitoConversation[] = data.map((conv: any) => {
        const cand = Array.isArray(conv.candidate) ? conv.candidate[0] : conv.candidate;
        const job = cand && (Array.isArray(cand.job) ? cand.job[0] : cand.job);
        const company = job && (Array.isArray(job.company) ? job.company[0] : job.company);
        const msgs = (conv.messages ?? []) as Array<{ content: string; created_at: string }>;
        const last = msgs.length
            ? msgs.reduce((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? a : b))
            : null;
        const name = cand ? `${cand.first_name ?? ""} ${cand.last_name ?? ""}`.trim() : "";
        return {
            candidateId: conv.candidate_id,
            jobId: conv.job_id,
            candidateName: name || "Unknown candidate",
            companyName: company?.company_name ?? null,
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

/** One 'recruito' thread for the admin reply view (service role → sender names resolve). */
export async function getRecruitoThreadForAdmin(candidateId: string): Promise<AdminRecruitoThread | null> {
    await requireAdmin();
    const sb = createAdminClient();

    const { data: conv } = await sb
        .from("conversations")
        .select("id, job_id")
        .eq("candidate_id", candidateId)
        .eq("conversation_type", "recruito")
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
 * Admin reply into the 'recruito' thread. Signature matches CandidateChat's
 * sendMessageFn (candidateId, jobId, content). Admins aren't participants, so the
 * insert goes through the service-role client; requireAdmin() authorizes it.
 */
export async function sendAdminMessage(
    candidateId: string,
    jobId: string,
    content: string,
): Promise<{ success?: boolean; error?: string }> {
    const { user } = await requireAdmin();
    const normalizedContent = content.trim();
    if (!normalizedContent) return { error: "Empty message" };

    const sb = createAdminClient();

    let { data: conv } = await sb
        .from("conversations")
        .select("id, job_id")
        .eq("candidate_id", candidateId)
        .eq("conversation_type", "recruito")
        .maybeSingle();

    if (!conv) {
        const { data: newConv, error: convErr } = await sb
            .from("conversations")
            .insert({ candidate_id: candidateId, job_id: jobId || null, conversation_type: "recruito" })
            .select("id, job_id")
            .single();
        if (convErr || !newConv) return { error: "Could not open conversation" };
        conv = newConv;
    }

    const { error: msgError } = await sb
        .from("messages")
        .insert({ conversation_id: conv.id, sender_id: user.id, content: normalizedContent });
    if (msgError) return { error: "Could not send message" };

    // Tell the company + recruiter that Recruito replied.
    const { data: cand } = await sb
        .from("candidates")
        .select("mandate_id, recruiter:recruiters(user_id), job:jobs(company:companies(user_id))")
        .eq("id", candidateId)
        .single();
    if (cand) {
        const rec = Array.isArray((cand as any).recruiter) ? (cand as any).recruiter[0] : (cand as any).recruiter;
        const job = Array.isArray((cand as any).job) ? (cand as any).job[0] : (cand as any).job;
        const company = job && (Array.isArray(job.company) ? job.company[0] : job.company);
        const mandateId = (cand as any).mandate_id as string | null;
        const body = normalizedContent.length > 50 ? normalizedContent.slice(0, 50) + "…" : normalizedContent;
        const targets = [
            { uid: company?.user_id as string | undefined, link: `/company/jobs/${conv.job_id}/candidates/${candidateId}` },
            { uid: rec?.user_id as string | undefined, link: mandateId ? `/recruiter/mandates/${mandateId}/candidates/${candidateId}` : "/recruiter/messages" },
        ];
        for (const t of targets) {
            if (t.uid) {
                await createNotification(t.uid, {
                    titleKey: "notif.newMessageTitle",
                    params: { sender: "Recruito" },
                    body,
                    link: t.link,
                });
            }
        }
    }

    revalidatePath("/admin/messages");
    revalidatePath(`/admin/messages/${candidateId}`);
    return { success: true };
}
