// Pure helpers for the per-candidate client presentation (replaced the batch
// Top-5 shortlist 2026-07-10 — recruiters present one candidate at a time, so
// the unit of generation is a single candidate's stored AI evaluation).
import { z } from "zod";

export const presentationSchema = z.object({
  title: z.string().optional(),
  pitch: z.string().min(1),
  shareText: z.string().optional(),
});

export type Presentation = z.infer<typeof presentationSchema>;

function extractJsonObject(text: string): unknown {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() ?? text.trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) throw new Error("Kunde inte läsa presentations-JSON");
    return JSON.parse(objectMatch[0]);
  }
}

export function parsePresentation(rawText: string): Presentation {
  return presentationSchema.parse(extractJsonObject(rawText));
}

// Client-facing text: no numeric AI scores here — clients get tier labels,
// never raw numbers (score-redaction decision 2026-07-02).
export function buildShareText(parsed: Presentation, candidateName: string, jobTitle: string): string {
  const fromModel = parsed.shareText?.trim();
  if (fromModel) return fromModel;
  return [parsed.title || `${candidateName} — ${jobTitle}`, "", parsed.pitch].join("\n");
}
