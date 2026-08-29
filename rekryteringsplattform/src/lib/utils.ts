import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCY_CONFIG, type Currency } from "@/lib/currency-config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined, currency: string = "EUR"): string {
  if (amount == null || isNaN(amount)) return "—";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

// Canonical Recruito client-fee formula. Matches the marketing calculator:
//   fee = max(salary × ((exclusive ? 10% : 11%) + guaranteeMonths × 1%),
//             minimum fee for the salary's currency)
// Exclusive is its own flat rate (10/11/12%) — "an exclusive rate for exclusive
// roles", not a discount. Per-currency minimums live in CURRENCY_CONFIG.
// Use this only to *suggest* a default fee at job creation. Once a job is approved,
// the locked client_fee_amount on the row is the source of truth — never recompute.
export const CLIENT_FEE_BASE_PCT = 0.11;
export const CLIENT_FEE_EXCLUSIVE_BASE_PCT = 0.10;
export const CLIENT_FEE_GUARANTEE_PCT = 0.01;
export const RECRUITER_FEE_DEFAULT_PCT = 0.07;

// Recruiter fee is guarantee-tiered (Sajid 2026-08-28): 0-day 6%, 30-day 6.5%,
// 60-day 7% of annual base salary. Indexed by guarantee months (0/1/2).
export const RECRUITER_FEE_PCT_BY_GUARANTEE = [0.06, 0.065, 0.07] as const;

// Round to the nearest 10, midpoints up — e.g. 524 → 520, 525 → 530.
export function roundToTen(amount: number): number {
  if (!amount || amount <= 0) return 0;
  return Math.round(amount / 10) * 10;
}

export function calculateClientFee(
  annualSalary: number,
  guaranteeMonths: number,
  isExclusive: boolean,
  currency: Currency,
): number {
  if (!annualSalary || annualSalary <= 0) return 0;
  const months = Math.max(0, Math.min(2, guaranteeMonths || 0));
  const base = isExclusive ? CLIENT_FEE_EXCLUSIVE_BASE_PCT : CLIENT_FEE_BASE_PCT;
  const raw = annualSalary * (base + months * CLIENT_FEE_GUARANTEE_PCT);
  return roundToTen(Math.max(raw, CURRENCY_CONFIG[currency].minFee));
}

// Floor to nearest 100 — e.g. 1 575 → 1 500, 1 625 → 1 600. Retained for the
// recruiter-jobs-list fallback display; fee locking uses calculateRecruiterFee.
export function floorToHundreds(amount: number): number {
  if (!amount || amount <= 0) return 0;
  return Math.floor(amount / 100) * 100;
}

// Recruiter fee: guarantee-tiered %, rounded to nearest 10, floored to the
// per-currency recruiter minimum. Independent of exclusive/standard.
export function calculateRecruiterFee(
  annualSalary: number,
  guaranteeMonths: number,
  currency: Currency,
): number {
  if (!annualSalary || annualSalary <= 0) return 0;
  const months = Math.max(0, Math.min(2, guaranteeMonths || 0));
  const pct = RECRUITER_FEE_PCT_BY_GUARANTEE[months];
  return Math.max(roundToTen(annualSalary * pct), CURRENCY_CONFIG[currency].recruiterMinFee);
}
