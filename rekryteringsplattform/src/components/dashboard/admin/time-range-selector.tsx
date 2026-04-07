"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeRangeSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

const TIME_RANGES = [
    { label: "Last 30 days", value: "30d" },
    { label: "Last 90 days", value: "90d" },
    { label: "Year to date", value: "ytd" },
    { label: "All time", value: "all" },
];

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
    return (
        <div className="flex gap-2 flex-wrap">
            {TIME_RANGES.map((range) => (
                <Button
                    key={range.value}
                    variant={value === range.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => onChange(range.value)}
                    className={cn(
                        "transition-all",
                        value === range.value && "bg-brand-600 text-white"
                    )}
                >
                    {range.label}
                </Button>
            ))}
        </div>
    );
}
