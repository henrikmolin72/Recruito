"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface FeeCalculatorProps {
  salaryMin?: number;
  salaryMax?: number;
  feePercentage: number;
}

export function FeeCalculator({
  salaryMin,
  salaryMax,
  feePercentage,
}: FeeCalculatorProps) {
  if (!salaryMin && !salaryMax) return null;

  const avgSalary = salaryMin && salaryMax
    ? Math.round((salaryMin + salaryMax) / 2)
    : salaryMin || salaryMax || 0;

  const totalFee = Math.round(avgSalary * (feePercentage / 100));
  const recruiterFee = Math.round(totalFee * 0.75);
  const traditionalFee = Math.round(avgSalary * 0.25);
  const savings = traditionalFee - totalFee;

  return (
    <Card className="bg-brand-50 border-brand-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Avgiftskalkylator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          Baserat på {formatCurrency(avgSalary)} i årslön:
        </p>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Total avgift ({feePercentage}%)</span>
            <span className="font-medium">{formatCurrency(totalFee)}</span>
          </div>
          <div className="flex justify-between">
            <span>Rekryteraren får</span>
            <span className="font-medium">{formatCurrency(recruiterFee)}</span>
          </div>
        </div>
        {savings > 0 && (
          <div className="mt-3 rounded-md bg-white p-3">
            <div className="flex justify-between text-muted-foreground">
              <span>Traditionell byrå (25%)</span>
              <span>{formatCurrency(traditionalFee)}</span>
            </div>
            <div className="mt-1 flex justify-between font-medium text-success-700">
              <span>Du sparar</span>
              <span>{formatCurrency(savings)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
