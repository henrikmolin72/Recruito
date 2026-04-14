"use client";

import { Banknote, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface CostRow {
    jobId: string;
    jobTitle: string;
    currency: string;
    annualSalary: number;
    recruiToCost: number;
    traditionalCost: number;
    saving: number;
    savingPct: number;
}

interface CostAnalysisCardProps {
    costs: CostRow[];
    totalSaving: number;
    totalRecruiTo: number;
    currency: string;
}

export function CostAnalysisCard({ costs, totalSaving, totalRecruiTo, currency }: CostAnalysisCardProps) {
    if (costs.length === 0) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-slate-400" />
                    <p className="text-sm text-slate-400 italic">No placements to analyze yet.</p>
                </div>
            </div>
        );
    }

    const totalTraditional = costs.reduce((a, c) => a + c.traditionalCost, 0);
    const savingPct = totalTraditional > 0
        ? Math.round((totalSaving / totalTraditional) * 100)
        : 0;

    return (
        <div className="space-y-5">
            {/* Big saving number */}
            <div className="rounded-xl bg-success-50 border border-success-200 p-4 flex items-center gap-4">
                <TrendingDown className="h-8 w-8 text-success-600 shrink-0" />
                <div>
                    <p className="text-3xl font-black text-success-700">
                        {formatCurrency(totalSaving, currency)}
                    </p>
                    <p className="text-xs text-success-600 font-semibold">
                        saved vs traditional agencies ({savingPct}% less)
                    </p>
                </div>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Paid to Recruito</p>
                    <p className="text-lg font-black text-slate-900 mt-1">{formatCurrency(totalRecruiTo, currency)}</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Traditional agency est.</p>
                    <p className="text-lg font-black text-slate-400 mt-1 line-through">
                        {formatCurrency(totalTraditional, currency)}
                    </p>
                    <p className="text-[10px] text-slate-400">at 20% of annual salary</p>
                </div>
            </div>

            {/* Per-placement table */}
            {costs.length > 0 && (
                <div className="border-t border-slate-100 pt-4 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Per Placement</p>
                    {costs.map((c) => (
                        <div key={c.jobId} className="rounded-lg border border-slate-100 bg-white p-3">
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-bold text-slate-700 truncate">{c.jobTitle}</p>
                                <span className="text-xs font-black text-success-700 shrink-0">
                                    -{c.savingPct}%
                                </span>
                            </div>
                            <div className="flex gap-4 mt-1.5 text-xs text-slate-500">
                                <span>Recruito: <strong className="text-slate-700">{formatCurrency(c.recruiToCost, c.currency)}</strong></span>
                                <span>Agency: <strong className="line-through text-slate-400">{formatCurrency(c.traditionalCost, c.currency)}</strong></span>
                                <span className="text-success-600 font-semibold">Save: {formatCurrency(c.saving, c.currency)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
