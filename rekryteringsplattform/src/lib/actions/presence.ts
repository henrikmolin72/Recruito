"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/actions/require-admin";
import {
    isPresenceRole,
    isOnline,
    sessionContinues,
    countOnlineByRole,
    aggregatePresenceByDay,
    ONLINE_WINDOW_MS,
    PRESENCE_HISTORY_DAYS,
    type OnlineCounts,
    type PresenceDay,
    type PresenceSessionRow,
} from "@/lib/presence";

/**
 * Dashboard heartbeat (every 60 s while the tab is visible). Extends the
 * caller's latest session or starts a new one after a 15-minute gap. Touches
 * only the current user's own rows; admins are not recorded. Never throws —
 * presence is best-effort and must not break the dashboard.
 */
export async function touchPresence(): Promise<void> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const admin = createAdminClient();
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
        const role = profile?.role;
        if (!isPresenceRole(role)) return;

        const nowIso = new Date().toISOString();
        const { data: latest } = await admin
            .from("presence_sessions")
            .select("id, last_seen_at")
            .eq("user_id", user.id)
            .order("last_seen_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (latest && sessionContinues(latest.last_seen_at)) {
            await admin.from("presence_sessions").update({ last_seen_at: nowIso }).eq("id", latest.id);
        } else {
            // ponytail: two heartbeats racing before the first row exists can both
            // insert — accepted churn: online counts and history are distinct-user
            // sets, so duplicate rows never inflate a visible number.
            await admin
                .from("presence_sessions")
                .insert({ user_id: user.id, role, started_at: nowIso, last_seen_at: nowIso });
        }
    } catch (err) {
        console.error("[touchPresence]", err);
    }
}

/** Admin header pill. Returns null when the query fails (e.g. migration 080
 *  not applied) so the pill shows "—" instead of a misleading 0. */
export async function getOnlineCounts(): Promise<OnlineCounts | null> {
    await requireAdmin();
    const admin = createAdminClient();
    const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
    const { data, error } = await admin
        .from("presence_sessions")
        .select("user_id, role, started_at, last_seen_at")
        .gte("last_seen_at", since);
    if (error) {
        console.error("[getOnlineCounts]", error.message);
        return null;
    }
    return countOnlineByRole((data || []) as PresenceSessionRow[]);
}

export interface OnlineUser {
    user_id: string;
    role: string;
    full_name: string;
    last_seen_at: string;
}

/** /admin/presence: who is online now + distinct users per day for the last 30 days. */
export async function getPresenceHistory(): Promise<{ onlineNow: OnlineUser[]; days: PresenceDay[] }> {
    await requireAdmin();
    const admin = createAdminClient();
    const now = Date.now();
    const historySince = new Date(now - PRESENCE_HISTORY_DAYS * 864e5).toISOString();
    // ponytail: PostgREST's default ~1000-row cap bounds this. Newest rows are
    // kept (order DESC), so onlineNow + recent days stay correct; only far-back
    // days would undercount at high traffic. Move the daily aggregation into SQL
    // (GROUP BY day/role) if history ever undercounts.
    const { data, error } = await admin
        .from("presence_sessions")
        .select("user_id, role, started_at, last_seen_at, profile:profiles(full_name)")
        .gte("started_at", historySince)
        .order("last_seen_at", { ascending: false });
    if (error) {
        console.error("[getPresenceHistory]", error.message);
        return { onlineNow: [], days: [] };
    }

    const sessions = (data || []) as any[];
    const seen = new Set<string>();
    const onlineNow: OnlineUser[] = [];
    for (const s of sessions) {
        if (!isOnline(s.last_seen_at, now) || seen.has(s.user_id)) continue;
        seen.add(s.user_id);
        const profile = Array.isArray(s.profile) ? s.profile[0] : s.profile;
        onlineNow.push({ user_id: s.user_id, role: s.role, full_name: profile?.full_name || "—", last_seen_at: s.last_seen_at });
    }
    return { onlineNow, days: aggregatePresenceByDay(sessions as PresenceSessionRow[]) };
}
