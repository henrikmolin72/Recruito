import { describe, it, expect } from "vitest";
import {
    isOnline,
    sessionContinues,
    countOnlineByRole,
    aggregatePresenceByDay,
    presenceDayKey,
    ONLINE_WINDOW_MS,
    SESSION_GAP_MS,
} from "./presence";

const NOW = Date.parse("2026-09-04T10:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("isOnline / sessionContinues", () => {
    it("online within 5 minutes, not after", () => {
        expect(isOnline(ago(ONLINE_WINDOW_MS), NOW)).toBe(true);
        expect(isOnline(ago(ONLINE_WINDOW_MS + 1), NOW)).toBe(false);
        expect(isOnline(null, NOW)).toBe(false);
        expect(isOnline("garbage", NOW)).toBe(false);
    });
    it("session continues within 15 minutes, restarts after", () => {
        expect(sessionContinues(ago(SESSION_GAP_MS), NOW)).toBe(true);
        expect(sessionContinues(ago(SESSION_GAP_MS + 1), NOW)).toBe(false);
        expect(sessionContinues(undefined, NOW)).toBe(false);
    });
});

describe("countOnlineByRole", () => {
    it("counts distinct online recruiters/companies; ignores admins and stale rows", () => {
        const rows = [
            { user_id: "r1", role: "recruiter", started_at: ago(60_000), last_seen_at: ago(1_000) },
            { user_id: "r1", role: "recruiter", started_at: ago(3_600_000), last_seen_at: ago(2_000) }, // same user twice
            { user_id: "r2", role: "recruiter", started_at: ago(3_600_000), last_seen_at: ago(3_600_000) }, // stale
            { user_id: "c1", role: "company", started_at: ago(60_000), last_seen_at: ago(10_000) },
            { user_id: "a1", role: "admin", started_at: ago(60_000), last_seen_at: ago(1_000) },
        ];
        expect(countOnlineByRole(rows, NOW)).toEqual({ recruiters: 1, companies: 1 });
        expect(countOnlineByRole([], NOW)).toEqual({ recruiters: 0, companies: 0 });
    });
});

describe("aggregatePresenceByDay", () => {
    it("buckets by Stockholm calendar day, distinct users per role, newest day first", () => {
        const rows = [
            // 23:30 UTC on Sep 3 is 01:30 on Sep 4 in Stockholm (CEST) → counts on Sep 4
            { user_id: "r1", role: "recruiter", started_at: "2026-09-03T23:30:00Z", last_seen_at: "2026-09-03T23:45:00Z" },
            { user_id: "r1", role: "recruiter", started_at: "2026-09-04T08:00:00Z", last_seen_at: "2026-09-04T08:10:00Z" },
            { user_id: "c1", role: "company", started_at: "2026-09-04T08:00:00Z", last_seen_at: "2026-09-04T08:10:00Z" },
            { user_id: "a1", role: "admin", started_at: "2026-09-04T08:00:00Z", last_seen_at: "2026-09-04T08:10:00Z" },
            { user_id: "r2", role: "recruiter", started_at: "2026-09-02T12:00:00Z", last_seen_at: "2026-09-02T12:30:00Z" },
        ];
        expect(aggregatePresenceByDay(rows)).toEqual([
            { day: "2026-09-04", recruiters: 1, companies: 1 },
            { day: "2026-09-02", recruiters: 1, companies: 0 },
        ]);
    });
    it("presenceDayKey renders YYYY-MM-DD", () => {
        expect(presenceDayKey("2026-09-04T08:00:00Z")).toBe("2026-09-04");
    });
});
