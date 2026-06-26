export interface PricingTier {
    /** Minimum completed placements within the rolling window to qualify */
    minPlacements: number;
    /** Fee percentage for this tier */
    feePercentage: number;
    /** Translation key for the tier name (e.g. "pricing.gold") */
    labelKey: string;
}

/** Tiers ordered from highest threshold to lowest. First match wins. */
export const PRICING_TIERS: PricingTier[] = [
    { minPlacements: 5, feePercentage: 12, labelKey: "pricing.gold" },
    { minPlacements: 3, feePercentage: 13, labelKey: "pricing.silver" },
    { minPlacements: 0, feePercentage: 15, labelKey: "pricing.standard" },
];

/** Rolling window in months for tier qualification */
export const TIER_WINDOW_MONTHS = 12;

/** Returns the matching tier for a given placement count. */
export function getTierForPlacementCount(completedPlacements: number): PricingTier {
    for (const tier of PRICING_TIERS) {
        if (completedPlacements >= tier.minPlacements) {
            return tier;
        }
    }
    return PRICING_TIERS[PRICING_TIERS.length - 1];
}

/** Returns the fee percentage for a given placement count. */
export function getFeePercentage(completedPlacements: number): number {
    return getTierForPlacementCount(completedPlacements).feePercentage;
}
