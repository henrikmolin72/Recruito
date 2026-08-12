import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownReport } from "./markdown-report";

describe("MarkdownReport injection-surface hardening", () => {
  it("renders markdown links as plain text — no anchors, no URL", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownReport, { markdown: "See [full CV](https://evil.example/phish)." })
    );
    expect(html).not.toContain("<a");
    expect(html).toContain("full CV");
    expect(html).not.toContain("evil.example");
  });

  it("drops images entirely — no tracking pixels", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownReport, { markdown: "![x](https://evil.example/pixel.png)" })
    );
    expect(html).not.toContain("<img");
  });
});
