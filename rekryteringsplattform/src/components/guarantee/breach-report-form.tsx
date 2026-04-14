"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const REASONS = [
    { value: "candidate_resigned", label: "Kandidaten sade upp sig" },
    { value: "performance", label: "Ej uppfyllda krav / prestation" },
    { value: "mutual_agreement", label: "Ömsesidig överenskommelse" },
    { value: "other", label: "Annat" },
] as const;

interface BreachReportFormProps {
    placementId: string;
    candidateName: string;
    jobTitle: string;
    currency?: string;
    className?: string;
    onSuccess?: (refundAmount: number) => void;
}

export function BreachReportForm({
    placementId,
    candidateName,
    jobTitle,
    currency = "SEK",
    className,
    onSuccess,
}: BreachReportFormProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        endDate: "",
        reason: "candidate_resigned" as typeof REASONS[number]["value"],
        notes: "",
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.endDate) { setError("Ange ett slutdatum."); return; }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/guarantee/breach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ placementId, ...form }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Fel");
            setSuccess(data.refundAmount);
            onSuccess?.(data.refundAmount);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Okänt fel");
        } finally {
            setLoading(false);
        }
    }

    if (success !== null) {
        return (
            <div className={cn("rounded-xl border border-success-200 bg-success-50 p-4 text-sm", className)}>
                <p className="font-bold text-success-700">Garantibrott rapporterat ✓</p>
                <p className="text-success-600 mt-1">
                    Möjlig återbetalning: <strong>{formatCurrency(success, currency)}</strong>. Admin granskar ärendet.
                </p>
            </div>
        );
    }

    return (
        <div className={className}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
                <AlertTriangle className="h-3.5 w-3.5" />
                Rapportera garantibrott
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            </button>

            {open && (
                <Card className="mt-3 border-red-200">
                    <CardContent className="p-5">
                        <p className="text-sm font-bold text-slate-800 mb-4">
                            Garantibrott — {candidateName} ({jobTitle})
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                        Kandidatens sista dag *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={form.endDate}
                                        onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                        Orsak *
                                    </label>
                                    <select
                                        value={form.reason}
                                        onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value as typeof form.reason }))}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                                    >
                                        {REASONS.map((r) => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                    Ytterligare kommentar (valfritt)
                                </label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                    rows={3}
                                    maxLength={1000}
                                    placeholder="Beskriv kort vad som hände..."
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none"
                                />
                            </div>

                            {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

                            <div className="flex items-center gap-3">
                                <Button type="submit" disabled={loading} className="gap-2 bg-red-600 hover:bg-red-700">
                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Skicka rapport
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                                    Avbryt
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
