import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, { variant: "success" | "warning" | "danger" | "blue" | "purple" | "default"; label: string }> = {
  draft: { variant: "default", label: "Utkast" },
  active: { variant: "blue", label: "Aktiv" },
  paused: { variant: "default", label: "Pausad" },
  filled: { variant: "success", label: "Tillsatt" },
  closed: { variant: "default", label: "Stängd" },
  cancelled: { variant: "danger", label: "Avbruten" },
  submitted: { variant: "warning", label: "Inskickad" },
  reviewing: { variant: "blue", label: "Granskas" },
  interview: { variant: "purple", label: "Intervju" },
  offered: { variant: "warning", label: "Erbjudande" },
  hired: { variant: "success", label: "Anställd" },
  guarantee_period: { variant: "blue", label: "Garantiperiod" },
  completed: { variant: "success", label: "Slutförd" },
  rejected: { variant: "danger", label: "Nekad" },
  declined: { variant: "danger", label: "Avböjd" },
  pending: { variant: "warning", label: "Väntande" },
  approved: { variant: "success", label: "Godkänd" },
  suspended: { variant: "danger", label: "Avstängd" },
  confirmed: { variant: "blue", label: "Bekräftad" },
  invoice_sent: { variant: "warning", label: "Faktura skickad" },
  payment_received: { variant: "success", label: "Betald" },
  guarantee_active: { variant: "blue", label: "Garantiperiod" },
  payout_released: { variant: "success", label: "Utbetald" },
  guarantee_failed: { variant: "danger", label: "Garanti fallerad" },
  refund_processing: { variant: "warning", label: "Återbetalning" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || { variant: "default" as const, label: status };
  return <Badge variant={style.variant}>{style.label}</Badge>;
}
