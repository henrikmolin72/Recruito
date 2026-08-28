import { timingSafeEqual } from "crypto";

/**
 * Constant-time string comparison for secrets (cron/preview tokens).
 * Returns false if either side is missing or lengths differ — length is not
 * secret for these fixed-length, high-entropy tokens, and this avoids the
 * byte-by-byte early-exit of `===`.
 */
export function timingSafeEqualStr(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
