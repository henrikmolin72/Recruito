"use client";

import { useState } from "react";
import { updateClientFeeAmount, updateRecruiterFeeAmount } from "@/lib/actions/admin";
import { toast } from "sonner";
import { Check, Pencil, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface JobFeeAmountEditorProps {
    jobId: string;
    initialAmount: number | null;
    currency?: string;
    field: "client" | "recruiter";
}

export function JobFeeAmountEditor({ jobId, initialAmount, currency = "EUR", field }: JobFeeAmountEditorProps) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(initialAmount != null ? String(initialAmount) : "");
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        const amount = parseFloat(value);
        if (isNaN(amount) || amount < 0) {
            toast.error("Enter a valid amount");
            return;
        }
        setSaving(true);
        const action = field === "client" ? updateClientFeeAmount : updateRecruiterFeeAmount;
        const result = await action(jobId, amount);
        setSaving(false);
        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success("Fee updated");
            setEditing(false);
        }
    }

    if (!editing) {
        return (
            <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 group font-bold text-slate-700 hover:text-brand-600 transition-colors"
            >
                {initialAmount != null ? formatCurrency(Number(value || initialAmount), currency) : "—"}
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-brand-500" />
            </button>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <input
                type="number"
                min="0"
                step="100"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-24 rounded border border-brand-300 px-1.5 py-0.5 text-sm font-bold text-right focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
            <span className="text-slate-500 text-xs">{currency}</span>
            <button onClick={handleSave} disabled={saving} className="text-success-600 hover:text-success-700">
                <Check className="h-4 w-4" />
            </button>
            <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
