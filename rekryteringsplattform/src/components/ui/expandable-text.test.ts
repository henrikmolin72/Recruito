import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExpandableText } from "./expandable-text";

// The collapsed render is what the server ships (useEffect / overflow
// measurement is client-only). It must clamp the body to two lines and render
// the text so a truncated notification is at least partially visible before the
// client hydrates and reveals the "Show more" toggle for overflowing messages.
// No JSX here so the file matches the src/**/*.test.ts vitest glob.
describe("ExpandableText", () => {
    it("renders the text clamped to two lines when collapsed", () => {
        const html = renderToStaticMarkup(
            createElement(ExpandableText, {
                text: "A very long notification body that would overflow two lines.",
                className: "text-xs text-muted-foreground",
            })
        );
        expect(html).toContain("A very long notification body");
        expect(html).toContain("line-clamp-2");
        // Toggle is measurement-gated (client-only) — absent in the server render.
        expect(html).not.toContain("<button");
    });

    it("passes through the caller's className alongside the clamp", () => {
        const html = renderToStaticMarkup(
            createElement(ExpandableText, { text: "hi", className: "leading-relaxed" })
        );
        expect(html).toContain("leading-relaxed");
        expect(html).toContain("line-clamp-2");
    });
});
