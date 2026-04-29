import type { ClientFeeUpliftReason } from "@/types/db-types";

export const CLIENT_FEE_UPLIFT_REASONS: ClientFeeUpliftReason[] = [
    'hard_to_fill',
    'niche_specialist',
    'senior_executive',
    'urgent_timeline',
    'custom',
];

export function isValidUpliftReason(v: unknown): v is ClientFeeUpliftReason {
    return typeof v === 'string' && (CLIENT_FEE_UPLIFT_REASONS as string[]).includes(v);
}

export function reasonI18nKey(reason: ClientFeeUpliftReason): string {
    return `feeReconfirm.reason.${reason}`;
}

export function requiresReconfirm(estimated: number | null, finalAmount: number | null): boolean {
    if (estimated == null || finalAmount == null) return false;
    return finalAmount > estimated;
}
