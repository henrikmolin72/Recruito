// Canonical AI match-level mapping (client request 2026-07-02, Sajid). Replaces
// raw percentages with quality tiers so the 75% submission threshold is the
// natural Good / Not-Recommended boundary. ONE source of truth for every surface —
// recruiter quick-screen, admin panel, and the company (client) badge — plus the
// server-side clamp that keeps sub-threshold candidates off the client's view.
//
//   95–100  Excellent Match   (client-visible)
//   85–94   Strong Match      (client-visible)
//   75–84   Good Match        (client-visible)
//   <75     Not Recommended   (recruiter/admin only — never surfaced to the client)
//   null    unscored          (not analysed yet — never a block)

export const CLIENT_MATCH_THRESHOLD = 75;

export type MatchTier = "excellent" | "strong" | "good" | "notRecommended" | "unscored";
export type MatchTone = "success" | "danger" | "muted";

export interface MatchLevel {
  tier: MatchTier;
  labelKey: string; // i18n key under components.*
  tone: MatchTone;
  clientVisible: boolean;
}

const LEVELS: Record<MatchTier, Omit<MatchLevel, "tier">> = {
  excellent: { labelKey: "components.matchLevelExcellent", tone: "success", clientVisible: true },
  strong: { labelKey: "components.matchLevelStrong", tone: "success", clientVisible: true },
  good: { labelKey: "components.matchLevelGood", tone: "success", clientVisible: true },
  notRecommended: { labelKey: "components.matchLevelNotRecommended", tone: "danger", clientVisible: false },
  // Re-uses the existing "Not analyzed" string rather than minting a new key.
  unscored: { labelKey: "components.scoreCardNotAnalyzed", tone: "muted", clientVisible: false },
};

function tierFor(score: number | null | undefined): MatchTier {
  if (score === null || score === undefined || Number.isNaN(score)) return "unscored";
  if (score >= 95) return "excellent";
  if (score >= 85) return "strong";
  if (score >= CLIENT_MATCH_THRESHOLD) return "good"; // 75–84
  return "notRecommended";
}

export function getMatchLevel(score: number | null | undefined): MatchLevel {
  const tier = tierFor(score);
  return { tier, ...LEVELS[tier] };
}

// Company (client) surfaces: returns null when the score's tier must never reach
// the client — Not Recommended (<75) or not-yet-analysed. Callers render nothing
// on null. This is the UI clamp half of the submission gate.
export function getClientMatchLevel(score: number | null | undefined): MatchLevel | null {
  const level = getMatchLevel(score);
  return level.clientVisible ? level : null;
}
