"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";

// Modal wrapper for the company AI report (client request 2026-07-07): the
// report moved off the page body behind a "View AI Report" button so the
// candidate view stays short. Children are server-rendered by the caller.
export function AiReportDialog({
    buttonLabel,
    title,
    closeLabel,
    children,
}: {
    buttonLabel: string;
    title: string;
    closeLabel: string;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const bodyRef = useRef<HTMLDivElement>(null);

    // Escape closes; initial focus lands on the scroll body so keyboard users
    // can arrow-scroll the long report immediately (Safari/Firefox don't make
    // overflow containers focusable on their own — hence tabIndex below).
    useEffect(() => {
        if (!open) return;
        bodyRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]);

    return (
        <>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
                <FileText className="h-4 w-4" /> {buttonLabel}
            </Button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    // mousedown (not click) so a text-selection drag that starts
                    // inside the panel and ends on the backdrop doesn't close it.
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setOpen(false);
                    }}
                >
                    <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
                            <button
                                type="button"
                                aria-label={closeLabel}
                                onClick={() => setOpen(false)}
                                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div ref={bodyRef} tabIndex={0} className="space-y-3 overflow-y-auto overscroll-contain px-6 py-4">
                            {children}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
