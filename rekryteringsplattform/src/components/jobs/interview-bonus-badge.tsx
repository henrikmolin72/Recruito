"use client";

import { Badge } from "@/components/ui/badge";
import { Gift } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InterviewBonusBadgeProps {
  showBonus: boolean;
}

export function InterviewBonusBadge({ showBonus }: InterviewBonusBadgeProps) {
  if (!showBonus) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 cursor-help">
            <Gift className="mr-1 h-3 w-3" />
            Intervjubonus
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium">Intervjubonus tillgänglig!</p>
          <ul className="mt-1 text-xs space-y-0.5">
            <li>50 EUR vid första intervjun</li>
            <li>100 EUR vid slutintervju</li>
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">
            Bonus utbetalas automatiskt när kandidaten når intervjustadiet.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
