import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "SEK"): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatRelativeDate(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Idag";
  if (days === 1) return "Igår";
  if (days < 7) return `${days} dagar sedan`;
  if (days < 30) return `${Math.floor(days / 7)} veckor sedan`;
  return formatDate(date);
}

export function calculateFee(annualSalary: number, feePercentage: number = 15): {
  totalFee: number;
  platformFee: number;
  recruiterFee: number;
} {
  const totalFee = annualSalary * (feePercentage / 100);
  const platformFee = totalFee * 0.25;
  const recruiterFee = totalFee * 0.75;
  return { totalFee, platformFee, recruiterFee };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
