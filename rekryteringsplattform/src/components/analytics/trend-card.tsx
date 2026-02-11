"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface TrendCardProps {
  month: string;
  value: number;
  previousValue: number;
  format?: "number" | "currency";
}

export function TrendCard({
  month,
  value,
  previousValue,
  format = "number",
}: TrendCardProps) {
  const changePercent =
    previousValue > 0
      ? Math.round(((value - previousValue) / previousValue) * 100)
      : value > 0
        ? 100
        : 0;

  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;
  const isNeutral = changePercent === 0;

  const displayValue =
    format === "currency"
      ? formatCurrency(value)
      : value.toLocaleString("sv-SE");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {month}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
        <div className="mt-1 flex items-center gap-1 text-sm">
          {isPositive && (
            <>
              <TrendingUp className="size-4 text-green-600" />
              <span className={cn("font-medium text-green-600")}>
                +{changePercent}%
              </span>
            </>
          )}
          {isNegative && (
            <>
              <TrendingDown className="size-4 text-red-600" />
              <span className={cn("font-medium text-red-600")}>
                {changePercent}%
              </span>
            </>
          )}
          {isNeutral && (
            <>
              <Minus className="size-4 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">0%</span>
            </>
          )}
          <span className="text-muted-foreground">vs förra månaden</span>
        </div>
      </CardContent>
    </Card>
  );
}
