import { describe, it, expect } from "vitest";
import { htmlToText } from "./download-job-description";

describe("htmlToText — the downloaded JD is plain text, not raw HTML", () => {
    it("strips tags but keeps paragraph and list structure", () => {
        const html =
            "<h3><strong>Key Responsibilities</strong></h3><ul><li><p>Manage day-to-day operations.</p></li><li><p>Lead the team.</p></li></ul><h2>Ideal Profile</h2><p>5+ years &amp; a &quot;can-do&quot; attitude.</p>";
        const out = htmlToText(html);
        expect(out).not.toMatch(/<[^>]+>/);
        expect(out).toContain("Key Responsibilities");
        expect(out).toContain("• Manage day-to-day operations.");
        expect(out).toContain("• Lead the team.");
        expect(out).toContain("Ideal Profile");
        expect(out).toContain('5+ years & a "can-do" attitude.');
    });

    it("passes plain text through unchanged", () => {
        expect(htmlToText("Just a plain description.")).toBe("Just a plain description.");
    });
});
