"use client";

import { Badge } from "@/components/ui/badge";
import { Sparkles, Star, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface MatchScoreBadgeProps {
  score: number;
  reasons?: string[];
  showReasons?: boolean;
  className?: string;
}

function getScoreConfig(score: number) {
  if (score >= 80) {
    return {
      label: "Utmarkt matchning",
      colorClasses: "bg-green-100 text-green-800 border-green-200",
      icon: Sparkles,
    };
  }
  if (score >= 60) {
    return {
      label: "Bra matchning",
      colorClasses: "bg-blue-100 text-blue-800 border-blue-200",
      icon: Star,
    };
  }
  if (score >= 40) {
    return {
      label: "Mojlig matchning",
      colorClasses: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: TrendingUp,
    };
  }
  return {
    label: "Lag matchning",
    colorClasses: "bg-gray-100 text-gray-600 border-gray-200",
    icon: Minus,
  };
}

export function MatchScoreBadge({
  score,
  reasons = [],
  showReasons = false,
  className,
}: MatchScoreBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const config = getScoreConfig(score);
  const Icon = config.icon;

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <Badge
        variant="outline"
        className={cn(
          "cursor-default gap-1 text-xs font-medium",
          config.colorClasses,
          showReasons && reasons.length > 0 && "cursor-pointer"
        )}
        onClick={() => {
          if (showReasons && reasons.length > 0) {
            setExpanded(!expanded);
          }
        }}
      >
        <Icon className="size-3" />
        {score}% - {config.label}
      </Badge>
      {showReasons && expanded && reasons.length > 0 && (
        <div className="rounded-md border bg-muted/50 p-2 text-xs text-muted-foreground">
          <ul className="space-y-0.5">
            {reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="mt-0.5 block size-1 shrink-0 rounded-full bg-current" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
