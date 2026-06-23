import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { createTranslator } from "@/i18n/server";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
}

export async function StatsCard({ title, value, description, icon: Icon, trend }: StatsCardProps) {
  const t = await createTranslator();
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <p className={cn("text-xs mt-1", trend.positive ? "text-success-500" : "text-danger-500")}>
              {trend.positive ? "+" : ""}{trend.value}% {t("components.statsThisMonth")}
            </p>
          )}
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className="h-12 w-12 rounded-lg bg-brand-50 flex items-center justify-center">
          <Icon className="h-6 w-6 text-brand-600" />
        </div>
      </div>
    </Card>
  );
}
