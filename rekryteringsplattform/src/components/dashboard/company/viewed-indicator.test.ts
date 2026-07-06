import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ViewedIndicator } from "./viewed-indicator";

// The eye is the client's "already viewed" marker on candidate cards: it must
// appear iff company_viewed_at is set (passed in as `viewed`). No JSX here so
// the test matches the existing src/**/*.test.ts vitest glob.
describe("ViewedIndicator", () => {
  it("renders an accessible eye icon when the candidate has been viewed", () => {
    const html = renderToStaticMarkup(
      createElement(ViewedIndicator, { viewed: true, label: "Viewed" })
    );
    expect(html).toContain("<svg"); // lucide Eye
    expect(html).toContain('aria-label="Viewed"');
    expect(html).toContain('title="Viewed"');
  });

  it("renders nothing when the candidate has not been viewed", () => {
    const html = renderToStaticMarkup(
      createElement(ViewedIndicator, { viewed: false, label: "Viewed" })
    );
    expect(html).toBe("");
  });
});
