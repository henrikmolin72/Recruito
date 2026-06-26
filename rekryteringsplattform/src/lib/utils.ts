import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
//   fee = max(salary × (11% + guaranteeMonths × 1%) × (exclusive ? 0.9 : 1), 3500)
// Use this only to *suggest* a default fee at job creation. Once a job is approved,
// the locked client_fee_amount on the row is the source of truth — never recompute.
export const CLIENT_FEE_BASE_PCT = 0.11;
export const CLIENT_FEE_GUARANTEE_PCT = 0.01;
export const CLIENT_FEE_EXCLUSIVE_DISCOUNT = 0.10;
export const CLIENT_FEE_MIN = 3500;
export const RECRUITER_FEE_DEFAULT_PCT = 0.07;

export function calculateClientFee(
  annualSalary: number,
  guaranteeMonths: number = 0,
  isExclusive: boolean = false,
): number {
  if (!annualSalary || annualSalary <= 0) return 0;
  const months = Math.max(0, Math.min(2, guaranteeMonths || 0));
  const commission = CLIENT_FEE_BASE_PCT + months * CLIENT_FEE_GUARANTEE_PCT;
  const discount = isExclusive ? 1 - CLIENT_FEE_EXCLUSIVE_DISCOUNT : 1;
  const raw = annualSalary * commission * discount;
  return Math.round(Math.max(raw, CLIENT_FEE_MIN));
}

// Floor to nearest 100 — e.g. 1 575 → 1 500, 1 625 → 1 600.
export function floorToHundreds(amount: number): number {
  if (!amount || amount <= 0) return 0;
  return Math.floor(amount / 100) * 100;
}

export function calculateRecruiterFee(annualSalary: number): number {
  if (!annualSalary || annualSalary <= 0) return 0;
  return floorToHundreds(annualSalary * RECRUITER_FEE_DEFAULT_PCT);
}
