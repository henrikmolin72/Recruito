"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendCardProps {
    title: string;
    value: string | number;
    description?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    icon?: React.ReactNode;
    className?: string;
}

export function TrendCard({
    title,
    value,
    description,
    trend,
    icon,
    className,
}: TrendCardProps) {
    return (
        <Card className={cn("", className)}>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-500">{title}</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-slate-900">{value}</p>
                            {trend && (
                                <div
                                    className={cn(
                                        "flex items-center gap-1 text-sm font-medium",
                                        trend.isPositive ? "text-green-600" : "text-red-600"
                                    )}
                                >
                                    {trend.isPositive ? (
                                        <TrendingUp className="h-4 w-4" />
                                    ) : (
                                        <TrendingDown className="h-4 w-4" />
                                    )}
                                    {trend.value}%
                                </div>
                            )}
                        </div>
                        {description && (
                            <p className="text-xs text-slate-500">{description}</p>
                        )}
                    </div>
                    {icon && (
                        <div className="text-slate-300">
                            {icon}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
