import { describe, it, expect } from "vitest";
import { selectMarketplaceJobs } from "./marketplace-visibility";

describe("selectMarketplaceJobs", () => {
    const activeClaimed = new Set<string>(["paused-claimed", "active-claimed"]);
    const jobs = [
        { id: "paused-claimed", status: "paused" },
        { id: "paused-open", status: "paused" },
        { id: "active-claimed", status: "active" },
        { id: "active-open", status: "active" },
    ];
    const visibleIds = () => selectMarketplaceJobs(jobs, activeClaimed).map((j) => j.id);

    // The reported bug: a re-claimed job that the company has PAUSED leaked back
    // into Browse Jobs even though it was already in "My Mandates".
    it("hides a paused job the recruiter actively holds", () => {
        expect(visibleIds()).not.toContain("paused-claimed");
    });

    it("keeps a paused job the recruiter has not claimed", () => {
        expect(visibleIds()).toContain("paused-open");
    });

    it("hides an active job the recruiter actively holds", () => {
        expect(visibleIds()).not.toContain("active-claimed");
    });

    it("keeps an active, unclaimed job (still shown even when slots are full)", () => {
        expect(visibleIds()).toContain("active-open");
    });
});
