"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricGridProps {
    children: ReactNode;
    cols?: 1 | 2 | 3 | 4;
    gap?: "sm" | "md" | "lg";
    className?: string;
}

const colsClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
};

const gapClasses = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
};

export function MetricGrid({
    children,
    cols = 4,
    gap = "md",
    className,
}: MetricGridProps) {
    return (
        <div
            className={cn(
                "grid",
                colsClasses[cols],
                gapClasses[gap],
                className
            )}
        >
            {children}
        </div>
    );
}
