import { describe, it, expect } from "vitest";
import { getMatchLevel, getClientMatchLevel, CLIENT_MATCH_THRESHOLD } from "./match-level";

describe("getMatchLevel — boundaries (the client's spec table)", () => {
  it("maps every band boundary exactly", () => {
    expect(getMatchLevel(100).tier).toBe("excellent");
    expect(getMatchLevel(95).tier).toBe("excellent");
    expect(getMatchLevel(94).tier).toBe("strong");
    expect(getMatchLevel(85).tier).toBe("strong");
    expect(getMatchLevel(84).tier).toBe("good");
    expect(getMatchLevel(75).tier).toBe("good"); // threshold is inclusive
    expect(getMatchLevel(74).tier).toBe("notRecommended");
    expect(getMatchLevel(0).tier).toBe("notRecommended");
  });

  it("75 is the Good / Not-Recommended boundary and equals the shared constant", () => {
    expect(CLIENT_MATCH_THRESHOLD).toBe(75);
    expect(getMatchLevel(CLIENT_MATCH_THRESHOLD).tier).toBe("good");
    expect(getMatchLevel(CLIENT_MATCH_THRESHOLD - 1).tier).toBe("notRecommended");
  });

  it("treats null / undefined / NaN as unscored — never Not Recommended", () => {
    expect(getMatchLevel(null).tier).toBe("unscored");
    expect(getMatchLevel(undefined).tier).toBe("unscored");
    expect(getMatchLevel(NaN).tier).toBe("unscored");
  });

  it("marks only the three top tiers as client-visible", () => {
    expect(getMatchLevel(96).clientVisible).toBe(true);
    expect(getMatchLevel(88).clientVisible).toBe(true);
    expect(getMatchLevel(75).clientVisible).toBe(true);
    expect(getMatchLevel(74).clientVisible).toBe(false);
    expect(getMatchLevel(null).clientVisible).toBe(false);
  });
});

describe("getClientMatchLevel — the UI clamp", () => {
  it("returns the level for client-visible tiers", () => {
    expect(getClientMatchLevel(95)?.tier).toBe("excellent");
    expect(getClientMatchLevel(85)?.tier).toBe("strong");
    expect(getClientMatchLevel(75)?.tier).toBe("good");
  });

  it("returns null for Not Recommended and unscored (never reaches the client)", () => {
    expect(getClientMatchLevel(74)).toBeNull();
    expect(getClientMatchLevel(0)).toBeNull();
    expect(getClientMatchLevel(null)).toBeNull();
    expect(getClientMatchLevel(undefined)).toBeNull();
  });
});
