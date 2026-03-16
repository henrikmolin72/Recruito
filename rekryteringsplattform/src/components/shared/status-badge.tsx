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
  duplicate_rejected: "danger",
  client_already_engaged: "warning",
  under_client_review: "blue",
  info_requested: "warning",
  resubmitted: "blue",
  interview_stage_1: "purple",
  interview_stage_2: "purple",
  interview_stage_3: "purple",
  final_interview: "purple",
  rejected_client: "danger",
  rejected_interview: "danger",
  on_hold: "default",
  offer_in_progress: "warning",
  offer_declined: "danger",
  offer_accepted: "success",
  invoice_enabled: "blue",
  guarantee_tracking: "blue",
  candidate_withdrawn: "danger",
  submitted_to_client: "success",
  recruiter_rejected: "danger",
  new: "blue",
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
