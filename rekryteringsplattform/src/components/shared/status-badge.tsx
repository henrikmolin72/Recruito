import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  active: "bg-green-50 text-green-700 border-green-200",
  paused: "bg-yellow-50 text-yellow-700 border-yellow-200",
  filled: "bg-blue-50 text-blue-700 border-blue-200",
  closed: "bg-gray-100 text-gray-500 border-gray-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  reviewing: "bg-purple-50 text-purple-700 border-purple-200",
  interview: "bg-indigo-50 text-indigo-700 border-indigo-200",
  offered: "bg-amber-50 text-amber-700 border-amber-200",
  hired: "bg-green-50 text-green-700 border-green-200",
  guarantee_period: "bg-cyan-50 text-cyan-700 border-cyan-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  declined: "bg-orange-50 text-orange-700 border-orange-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  invoice_sent: "bg-indigo-50 text-indigo-700 border-indigo-200",
  payment_received: "bg-green-50 text-green-700 border-green-200",
  guarantee_active: "bg-cyan-50 text-cyan-700 border-cyan-200",
  payout_released: "bg-emerald-50 text-emerald-700 border-emerald-200",
  guarantee_failed: "bg-red-50 text-red-700 border-red-200",
  refund_processing: "bg-orange-50 text-orange-700 border-orange-200",
};

const statusLabels: Record<string, string> = {
  draft: "Utkast",
  active: "Aktiv",
  paused: "Pausad",
  filled: "Tillsatt",
  closed: "Stängd",
  cancelled: "Avbruten",
  submitted: "Inskickad",
  reviewing: "Granskas",
  interview: "Intervju",
  offered: "Erbjuden",
  hired: "Anställd",
  guarantee_period: "Garantiperiod",
  completed: "Slutförd",
  rejected: "Nekad",
  declined: "Avböjd",
  pending: "Väntande",
  approved: "Godkänd",
  suspended: "Avstängd",
  confirmed: "Bekräftad",
  invoice_sent: "Faktura skickad",
  payment_received: "Betalning mottagen",
  guarantee_active: "Garanti aktiv",
  payout_released: "Utbetalning gjord",
  guarantee_failed: "Garanti misslyckad",
  refund_processing: "Återbetalning pågår",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(statusStyles[status] ?? "bg-gray-100 text-gray-700", className)}
    >
      {statusLabels[status] ?? status}
    </Badge>
  );
}
