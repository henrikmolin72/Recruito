export interface PricingTier {
    /** Minimum completed placements within the rolling window to qualify */
    minPlacements: number;
    /** Fee percentage for this tier */
    feePercentage: number;
    /** Human-readable tier name */
    label: string;
}

/** Tiers ordered from highest threshold to lowest. First match wins. */
export const PRICING_TIERS: PricingTier[] = [
    { minPlacements: 5, feePercentage: 12, label: "Guld" },
    { minPlacements: 3, feePercentage: 13, label: "Silver" },
    { minPlacements: 0, feePercentage: 15, label: "Standard" },
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

/**
 * Returns how many more placements are needed to reach the next tier,
 * or null if already at the best tier.
 */
export function placementsUntilNextTier(
    completedPlacements: number
): { needed: number; nextTier: PricingTier } | null {
    const current = getTierForPlacementCount(completedPlacements);
    const currentIndex = PRICING_TIERS.indexOf(current);
    if (currentIndex <= 0) return null;
    const nextTier = PRICING_TIERS[currentIndex - 1];
    return {
        needed: nextTier.minPlacements - completedPlacements,
        nextTier,
    };
}
