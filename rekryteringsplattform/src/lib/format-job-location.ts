import { normalizeCountry } from "@/lib/job-form-options";

type LocationParts = {
  city?: string | null;
  location?: string | null; // free-text area / zip; legacy rows may embed the city
  country?: string | null;
};

// Client-requested display format (2026-07-14, images 03-05):
// "City, Area, Country" — e.g. "Stockholm, Down Town, Sweden",
// "Stockholm, 94103, Sweden", or just "Stockholm, Sweden".
export function formatJobLocation(job: LocationParts): string {
  const city = (job.city ?? "").trim();
  const country = job.country?.trim() ? normalizeCountry(job.country.trim()) : "";
  let area = (job.location ?? "").trim();
  if (city && area) {
    const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    area = area.replace(new RegExp(`^${escaped}[,\\s]*`, "i"), "").trim();
  }
  if (
    area &&
    (area.toLowerCase() === city.toLowerCase() || area.toLowerCase() === country.toLowerCase())
  ) {
    area = "";
  }
  return [city, area, country].filter(Boolean).join(", ");
}
