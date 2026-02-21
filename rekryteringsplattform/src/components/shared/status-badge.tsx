"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/i18n/client";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "danger" | "blue" | "purple" | "default"> = {
  draft: "default",
  active: "blue",
  paused: "default",
  filled: "success",
  closed: "default",
  cancelled: "danger",
  submitted: "warning",
  reviewing: "blue",
  interview: "purple",
  offered: "warning",
  hired: "success",
  guarantee_period: "blue",
  completed: "success",
  rejected: "danger",
  declined: "danger",
  pending: "warning",
  approved: "success",
  suspended: "danger",
  confirmed: "blue",
  invoice_sent: "warning",
  payment_received: "success",
  guarantee_active: "blue",
  payout_released: "success",
  guarantee_failed: "danger",
  refund_processing: "warning",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslations();
  const variant = STATUS_VARIANTS[status] || "default";
  const label = t(`status.${status}`);
  return <Badge variant={variant}>{label}</Badge>;
}
