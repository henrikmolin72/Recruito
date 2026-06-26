import { describe, it, expect, beforeEach, vi } from "vitest";

// Unit tests for the admin fan-out helper. The contract: read every admin
// profile and create one notification per admin, and never throw (a failure
// must not block the company/recruiter action that triggered it).

// `server-only` is a Next.js build-time guard with no vitest resolution; stub it.
vi.mock("server-only", () => ({}));

const { createNotificationMock } = vi.hoisted(() => ({ createNotificationMock: vi.fn() }));
const state = vi.hoisted(() => ({ admins: [] as Array<{ id: string }> | null, throwOnQuery: false }));

vi.mock("@/lib/notifications/create", () => ({
    createNotification: createNotificationMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
    createAdminClient: () => ({
        from: (_table: string) => ({
            select: (_cols: string) => ({
                eq: (_col: string, _val: string) => {
                    if (state.throwOnQuery) throw new Error("db down");
                    return Promise.resolve({ data: state.admins });
                },
            }),
        }),
    }),
}));

import { notifyAdmins } from "./notify-admins";

describe("notifyAdmins", () => {
    beforeEach(() => {
        createNotificationMock.mockReset();
        state.admins = [];
        state.throwOnQuery = false;
    });

    it("fans a single notification out to every admin", async () => {
        state.admins = [{ id: "a1" }, { id: "a2" }, { id: "a3" }];

        await notifyAdmins({
            titleKey: "notif.adminJobClosedTitle",
            bodyKey: "notif.adminJobClosedBody",
            params: { company: "Acme", jobTitle: "Electrical Engineer" },
            link: "/admin/jobs",
        });

        expect(createNotificationMock).toHaveBeenCalledTimes(3);
        for (const id of ["a1", "a2", "a3"]) {
            expect(createNotificationMock).toHaveBeenCalledWith(
                id,
                expect.objectContaining({ titleKey: "notif.adminJobClosedTitle", link: "/admin/jobs" }),
            );
        }
    });

    it("is a no-op when there are no admins", async () => {
        state.admins = [];
        await notifyAdmins({ titleKey: "notif.x", bodyKey: "notif.y" });
        expect(createNotificationMock).not.toHaveBeenCalled();
    });

    it("swallows errors so it never blocks the triggering action", async () => {
        state.throwOnQuery = true;
        await expect(
            notifyAdmins({ titleKey: "notif.x", bodyKey: "notif.y" }),
        ).resolves.toBeUndefined();
        expect(createNotificationMock).not.toHaveBeenCalled();
    });
});
