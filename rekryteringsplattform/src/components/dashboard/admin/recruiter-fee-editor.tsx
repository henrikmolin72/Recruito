"use client";

import { useState } from "react";
import { updateRecruiterFeePercentage } from "@/lib/actions/admin";
import { toast } from "sonner";
import { Check, Pencil, X } from "lucide-react";

interface RecruiterFeeEditorProps {
    jobId: string;
    initialFee: number;
}

export function RecruiterFeeEditor({ jobId, initialFee }: RecruiterFeeEditorProps) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(String(initialFee));
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        const pct = parseFloat(value);
        if (isNaN(pct) || pct < 0 || pct > 100) {
            toast.error("Enter a valid percentage (0–100)");
            return;
        }
        setSaving(true);
        const result = await updateRecruiterFeePercentage(jobId, pct);
        setSaving(false);
        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success("Recruiter fee updated");
            setEditing(false);
        }
    }

    if (!editing) {
        return (
            <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 group font-bold text-slate-700 hover:text-brand-600 transition-colors"
            >
                {value}%
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-brand-500" />
            </button>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-16 rounded border border-brand-300 px-1.5 py-0.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
            <span className="text-slate-500 text-xs">%</span>
            <button onClick={handleSave} disabled={saving} className="text-success-600 hover:text-success-700">
                <Check className="h-4 w-4" />
            </button>
            <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
