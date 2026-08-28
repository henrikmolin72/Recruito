import { describe, it, expect } from "vitest";
import { timingSafeEqualStr } from "./timing-safe-equal";

describe("timingSafeEqualStr", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeEqualStr("s3cret-token", "s3cret-token")).toBe(true);
  });

  it("returns false for different strings of equal length", () => {
    expect(timingSafeEqualStr("aaaaaa", "aaaaab")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(timingSafeEqualStr("short", "longer-secret")).toBe(false);
  });

  it("returns false when either side is missing (fail closed if env unset)", () => {
    expect(timingSafeEqualStr("x", undefined)).toBe(false);
    expect(timingSafeEqualStr(undefined, "x")).toBe(false);
    expect(timingSafeEqualStr("", "")).toBe(false);
    expect(timingSafeEqualStr(null, null)).toBe(false);
  });
});
