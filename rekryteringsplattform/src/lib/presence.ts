// Presence rules shared by the heartbeat action, the admin header counter and
// the /admin/presence history page. Pure — no Supabase — so the thresholds and
// the day bucketing are unit-tested.

/** A user is "online" if their session was touched within this window. */
export const ONLINE_WINDOW_MS = 5 * 60_000;
/** A heartbeat later than this after the previous one starts a new session row. */
export const SESSION_GAP_MS = 15 * 60_000;
/** Days of history shown on /admin/presence. */
export const PRESENCE_HISTORY_DAYS = 30;

export type PresenceRole = "recruiter" | "company";

export function isPresenceRole(v: unknown): v is PresenceRole {
    return v === "recruiter" || v === "company";
}

export interface PresenceSessionRow {
    user_id: string;
    role: string;
    started_at: string;
    last_seen_at: string;
}

export interface OnlineCounts {
    recruiters: number;
    companies: number;
}

export interface PresenceDay {
    /** YYYY-MM-DD in Europe/Stockholm. */
    day: string;
    recruiters: number;
    companies: number;
}

function withinMs(iso: string | null | undefined, windowMs: number, now: number): boolean {
    if (!iso) return false;
    const t = Date.parse(iso);
    return Number.isFinite(t) && now - t <= windowMs;
}

export function isOnline(lastSeenAt: string | null | undefined, now = Date.now()): boolean {
    return withinMs(lastSeenAt, ONLINE_WINDOW_MS, now);
}

export function sessionContinues(lastSeenAt: string | null | undefined, now = Date.now()): boolean {
    return withinMs(lastSeenAt, SESSION_GAP_MS, now);
}

/** Distinct online users per role. Admins and unknown roles are ignored. */
export function countOnlineByRole(rows: PresenceSessionRow[], now = Date.now()): OnlineCounts {
    const seen = { recruiter: new Set<string>(), company: new Set<string>() };
    for (const r of rows) {
        if (!isPresenceRole(r.role) || !isOnline(r.last_seen_at, now)) continue;
        seen[r.role].add(r.user_id);
    }
    return { recruiters: seen.recruiter.size, companies: seen.company.size };
}

// Calendar day in the business timezone (the admin team sits in Sweden), so a
// 00:30 local session lands on the right day instead of the previous UTC day.
const dayFmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

/** sv-SE formats as ISO-like "YYYY-MM-DD". */
export function presenceDayKey(iso: string): string {
    return dayFmt.format(new Date(iso));
}

/** Distinct users per role per day (by session start), newest day first. */
export function aggregatePresenceByDay(rows: PresenceSessionRow[]): PresenceDay[] {
    const byDay = new Map<string, { recruiter: Set<string>; company: Set<string> }>();
    for (const r of rows) {
        if (!isPresenceRole(r.role)) continue;
        const day = presenceDayKey(r.started_at);
        const bucket = byDay.get(day) || { recruiter: new Set<string>(), company: new Set<string>() };
        bucket[r.role].add(r.user_id);
        byDay.set(day, bucket);
    }
    return [...byDay.entries()]
        .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
        .map(([day, b]) => ({ day, recruiters: b.recruiter.size, companies: b.company.size }));
}
