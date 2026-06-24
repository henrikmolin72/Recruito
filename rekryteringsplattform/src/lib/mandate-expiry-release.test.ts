import { describe, it, expect, vi, beforeEach } from "vitest";

const notifications: Array<{ uid: string }> = [];
vi.mock("@/lib/notifications/create", () => ({
    createNotification: vi.fn(async (uid: string) => {
        notifications.push({ uid });
    }),
}));

import { releaseDueMandates } from "./mandate-expiry-release";

let mandatesData: any[] = [];
const updates: Array<{ id: any; patch: any }> = [];

// Minimal chainable Supabase admin mock: select() resolves to mandatesData
// (optionally filtered by job_id IN), update().eq("id") records the write.
function makeAdmin(): any {
    return {
        from() {
            const ctx: any = { isUpdate: false, patch: null, filters: {} };
            const chain: any = {
                select: () => chain,
                update: (patch: any) => { ctx.isUpdate = true; ctx.patch = patch; return chain; },
                eq: (col: string, val: any) => { ctx.filters[col] = val; return chain; },
                in: (col: string, vals: any[]) => { ctx.filters[`${col}__in`] = vals; return chain; },
                then: (resolve: any, reject: any) => {
                    if (ctx.isUpdate) {
                        updates.push({ id: ctx.filters["id"], patch: ctx.patch });
                        return Promise.resolve({ data: null, error: null }).then(resolve, reject);
                    }
                    let rows = mandatesData;
                    if (ctx.filters["job_id__in"]) {
                        rows = rows.filter((r) => ctx.filters["job_id__in"].includes(r.job_id));
                    }
                    return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
                },
            };
            return chain;
        },
    };
}

const OLD = "2020-01-01T00:00:00Z"; // > 10 days ago → expired
const recent = () => new Date().toISOString(); // claimed just now → not expired

beforeEach(() => {
    notifications.length = 0;
    updates.length = 0;
    mandatesData = [];
});

describe("releaseDueMandates", () => {
    it("releases + notifies a due, not-yet-notified mandate", async () => {
        mandatesData = [
            { id: "m1", job_id: "j1", claimed_at: OLD, mandate_expiry_notified_at: null, recruiter: { user_id: "u1" }, candidates: [] },
        ];
        const res = await releaseDueMandates(makeAdmin());
        expect(updates).toHaveLength(1);
        expect(updates[0].id).toBe("m1");
        expect(updates[0].patch.is_active).toBe(false);
        expect(notifications.map((n) => n.uid)).toEqual(["u1"]);
        expect(res.released).toBe(1);
    });

    it("leaves a not-yet-expired mandate untouched", async () => {
        mandatesData = [
            { id: "m2", job_id: "j1", claimed_at: recent(), mandate_expiry_notified_at: null, recruiter: { user_id: "u2" }, candidates: [] },
        ];
        const res = await releaseDueMandates(makeAdmin());
        expect(updates).toHaveLength(0);
        expect(notifications).toHaveLength(0);
        expect(res.released).toBe(0);
    });

    it("STILL releases a due mandate that was already notified, without re-notifying (the stranded-slot fix)", async () => {
        mandatesData = [
            { id: "m3", job_id: "j1", claimed_at: OLD, mandate_expiry_notified_at: "2020-01-11T00:00:00Z", recruiter: { user_id: "u3" }, candidates: [] },
        ];
        const res = await releaseDueMandates(makeAdmin());
        expect(updates).toHaveLength(1);
        expect(updates[0].id).toBe("m3");
        expect(updates[0].patch.is_active).toBe(false);
        expect(notifications).toHaveLength(0); // not re-notified
        expect(res.released).toBe(1);
    });

    it("is a no-op when scoped to an empty jobId list", async () => {
        mandatesData = [
            { id: "m1", job_id: "j1", claimed_at: OLD, mandate_expiry_notified_at: null, recruiter: { user_id: "u1" }, candidates: [] },
        ];
        const res = await releaseDueMandates(makeAdmin(), { jobIds: [] });
        expect(updates).toHaveLength(0);
        expect(res).toEqual({ scanned: 0, notified: 0, released: 0 });
    });
});
