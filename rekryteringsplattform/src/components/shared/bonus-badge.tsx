import { Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Shown when a job has opted into the optional €100 final-interview recruiter
// incentive (jobs.final_interview_bonus). Gate on the flag at the call site.
export function BonusBadge({ label, className }: { label: string; className?: string }) {
  return (
    <Badge variant="warning" className={cn("gap-1", className)} title={label}>
      <Coins className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}
