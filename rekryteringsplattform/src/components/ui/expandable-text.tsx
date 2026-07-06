"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Body text that clamps to two lines and reveals a "Show more / Show less"
// toggle only when the text actually overflows — so users can read a full
// notification without leaving the list. The toggle stops click propagation so
// it never triggers a parent row's navigate / mark-as-read handler.
export function ExpandableText({
    text,
    className,
    moreLabel = "Show more",
    lessLabel = "Show less",
}: {
    text: string;
    className?: string;
    moreLabel?: string;
    lessLabel?: string;
}) {
    const ref = useRef<HTMLParagraphElement>(null);
    const [expanded, setExpanded] = useState(false);
    const [overflowing, setOverflowing] = useState(false);

    useEffect(() => {
        const el = ref.current;
        // Measure only while clamped: scrollHeight exceeds clientHeight when
        // -webkit-line-clamp has hidden overflowing lines.
        if (el && !expanded) setOverflowing(el.scrollHeight > el.clientHeight + 1);
    }, [text, expanded]);

    return (
        <div>
            <p ref={ref} className={cn(className, !expanded && "line-clamp-2")}>
                {text}
            </p>
            {(overflowing || expanded) && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded((v) => !v);
                    }}
                    className="mt-0.5 text-[11px] font-semibold text-brand-600 hover:underline"
                >
                    {expanded ? lessLabel : moreLabel}
                </button>
            )}
        </div>
    );
}
