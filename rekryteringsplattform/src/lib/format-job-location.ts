import { normalizeCountry } from "@/lib/job-form-options";

type LocationParts = {
  city?: string | null;
  location?: string | null; // free-text area / zip; legacy rows may embed the city
  country?: string | null;
};

// Client-requested display format (2026-07-14, images 03-05):
// "City, Area, Country" — e.g. "Stockholm, Down Town, Sweden",
// "Stockholm, 94103, Sweden", or just "Stockholm, Sweden".
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatJobLocation(job: LocationParts): string {
  const city = (job.city ?? "").trim();
  const rawCountry = (job.country ?? "").trim();
  const country = rawCountry ? normalizeCountry(rawCountry) : "";
  let area = (job.location ?? "").trim();
  if (city && area) {
    // Require a separator (or end) after the city so "Stockholmsmässan" survives.
    area = area.replace(new RegExp(`^${escapeRegExp(city)}(?:[,\\s]+|$)`, "i"), "").trim();
  }
  // Legacy free text may embed the country at the end ("Downtown, Sweden").
  for (const c of [country, rawCountry]) {
    if (c && area) {
      area = area.replace(new RegExp(`[,\\s]+${escapeRegExp(c)}$`, "i"), "").trim();
    }
  }
  if (
    area &&
    (area.toLowerCase() === city.toLowerCase() ||
      area.toLowerCase() === country.toLowerCase() ||
      area.toLowerCase() === rawCountry.toLowerCase())
  ) {
    area = "";
  }
  return [city, area, country].filter(Boolean).join(", ");
}
