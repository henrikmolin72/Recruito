import { describe, expect, it } from "vitest";
import { buildShareText, parsePresentation } from "./presentation";

describe("parsePresentation", () => {
  it("parses bare JSON", () => {
    const parsed = parsePresentation('{"title":"T","pitch":"P","shareText":"S"}');
    expect(parsed).toEqual({ title: "T", pitch: "P", shareText: "S" });
  });

  it("parses fenced JSON with surrounding prose", () => {
    const parsed = parsePresentation('Here you go:\n```json\n{"pitch":"P"}\n```');
    expect(parsed.pitch).toBe("P");
  });

  it("parses JSON embedded in junk text", () => {
    const parsed = parsePresentation('note {"pitch":"P"} trailing');
    expect(parsed.pitch).toBe("P");
  });

  it("throws on missing pitch", () => {
    expect(() => parsePresentation('{"title":"only"}')).toThrow();
  });

  it("throws on non-JSON", () => {
    expect(() => parsePresentation("no json here")).toThrow();
  });
});

describe("buildShareText", () => {
  it("prefers the model-provided shareText", () => {
    expect(buildShareText({ pitch: "P", shareText: " ready text " }, "Anna", "Engineer")).toBe("ready text");
  });

  it("falls back to title + pitch", () => {
    expect(buildShareText({ title: "T", pitch: "P" }, "Anna", "Engineer")).toBe("T\n\nP");
  });

  it("falls back to name — job title when no title", () => {
    expect(buildShareText({ pitch: "P" }, "Anna", "Engineer")).toBe("Anna — Engineer\n\nP");
  });
});
