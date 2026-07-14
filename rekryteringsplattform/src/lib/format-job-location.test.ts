import { describe, it, expect } from "vitest";
import { formatJobLocation } from "./format-job-location";

describe("formatJobLocation", () => {
  it("composes city, area, country", () => {
    expect(formatJobLocation({ city: "Stockholm", location: "Down Town", country: "Sweden" }))
      .toBe("Stockholm, Down Town, Sweden");
  });
  it("supports zip codes as area", () => {
    expect(formatJobLocation({ city: "Stockholm", location: "94103", country: "Sweden" }))
      .toBe("Stockholm, 94103, Sweden");
  });
  it("omits missing area", () => {
    expect(formatJobLocation({ city: "Stockholm", location: null, country: "Sweden" }))
      .toBe("Stockholm, Sweden");
  });
  it("strips a legacy city prefix from the free-text location", () => {
    expect(formatJobLocation({ city: "Stockholm", location: "Stockholm Down Town", country: "Sweden" }))
      .toBe("Stockholm, Down Town, Sweden");
  });
  it("drops an area that merely repeats city or country", () => {
    expect(formatJobLocation({ city: "Stockholm", location: "Stockholm", country: "Sweden" }))
      .toBe("Stockholm, Sweden");
  });
  it("normalizes legacy country values", () => {
    // "Sverige" is a key in LEGACY_COUNTRY_MAP (job-form-options.ts:234)
    expect(formatJobLocation({ city: "Stockholm", location: "", country: "Sverige" }))
      .toBe("Stockholm, Sweden");
  });
  it("falls back to free text alone when city/country missing", () => {
    expect(formatJobLocation({ city: "", location: "Remote", country: "" })).toBe("Remote");
  });
  it("does not chop concatenated place names sharing the city prefix", () => {
    expect(formatJobLocation({ city: "Stockholm", location: "Stockholmsmässan", country: "Sweden" }))
      .toBe("Stockholm, Stockholmsmässan, Sweden");
  });
  it("strips a comma-separated legacy city prefix", () => {
    expect(formatJobLocation({ city: "Stockholm", location: "Stockholm, Down Town", country: "Sweden" }))
      .toBe("Stockholm, Down Town, Sweden");
  });
  it("drops a trailing country embedded in legacy free text", () => {
    expect(formatJobLocation({ city: "Stockholm", location: "Downtown, Sweden", country: "Sweden" }))
      .toBe("Stockholm, Downtown, Sweden");
  });
  it("drops a trailing legacy-language country too", () => {
    expect(formatJobLocation({ city: "Stockholm", location: "Downtown, Sverige", country: "Sverige" }))
      .toBe("Stockholm, Downtown, Sweden");
  });
  it("keeps a city name that appears mid-area", () => {
    expect(formatJobLocation({ city: "Stockholm", location: "Norra Stockholm", country: "Sweden" }))
      .toBe("Stockholm, Norra Stockholm, Sweden");
  });
});
