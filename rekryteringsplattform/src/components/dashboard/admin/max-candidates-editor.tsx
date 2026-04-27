"use client";

import { useState } from "react";
import { setJobMaxCandidates } from "@/lib/actions/admin";
import { toast } from "sonner";
import { Pencil, Check, X } from "lucide-react";

interface MaxCandidatesEditorProps {
    jobId: string;
    initialMax: number;
    currentCount: number;
}

export function MaxCandidatesEditor({ jobId, initialMax, currentCount }: MaxCandidatesEditorProps) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(String(initialMax));
    const [saving, setSaving] = useState(false);
    const [max, setMax] = useState(initialMax);

    async function handleSave() {
        const n = parseInt(value, 10);
        if (!Number.isInteger(n) || n < 1 || n > 200) {
            toast.error("Enter an integer between 1 and 200.");
            return;
        }
        setSaving(true);
        const result = await setJobMaxCandidates(jobId, n);
        setSaving(false);
        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success("Submission cap updated");
            setMax(n);
            setEditing(false);
        }
    }

    const reached = currentCount >= max;

    if (!editing) {
        return (
            <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 group font-bold text-slate-700 hover:text-brand-600 transition-colors"
                title="Click to edit cap"
            >
                <span className={reached ? "text-amber-600" : "text-slate-700"}>
                    {currentCount}/{max}
                </span>
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-brand-500" />
            </button>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <input
                type="number"
                min={1}
                max={200}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={saving}
                className="w-16 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
            />
            <button
                onClick={handleSave}
                disabled={saving}
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-50"
                aria-label="Save"
            >
                <Check className="h-4 w-4" />
            </button>
            <button
                onClick={() => { setEditing(false); setValue(String(max)); }}
                disabled={saving}
                className="p-1 text-slate-400 hover:bg-slate-50 rounded disabled:opacity-50"
                aria-label="Cancel"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
