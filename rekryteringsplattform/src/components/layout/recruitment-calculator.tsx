"use client";

import { useState, useMemo } from "react";
import { Calculator, ChevronDown, ChevronUp, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRICING_TIERS } from "@/lib/pricing";

// ── Constants matching the platform pricing ──
const PLATFORM_CUT = 0.30; // 30% platform, 70% recruiter
const TRADITIONAL_FEE_PCT = 25; // Industry avg for traditional agencies
const GUARANTEE_MONTHS_OPTIONS = [0, 1, 2];

interface CalcResults {
    feePercentage: number;
    tierLabel: string;
    totalFee: number;
    costPerHire: number;
    totalCostAllHires: number;
    traditionalTotalFee: number;
    savings: number;
    savingsPercent: number;
    platformFee: number;
    recruiterPayout: number;
    guaranteeCost: number;
}

function calculate(
    annualSalary: number,
    numberOfHires: number,
    pastPlacements: number,
    _guaranteeMonths: number,
): CalcResults {
    // Determine tier
    const totalPlacements = pastPlacements + numberOfHires;
    let feePercentage = 15;
    let tierLabel = "Standard";
    for (const tier of PRICING_TIERS) {
        if (totalPlacements >= tier.minPlacements) {
            feePercentage = tier.feePercentage;
            tierLabel = tier.labelKey.replace("pricing.", "");
            tierLabel = tierLabel.charAt(0).toUpperCase() + tierLabel.slice(1);
            break;
        }
    }

    const totalFee = annualSalary * (feePercentage / 100);
    const costPerHire = totalFee;
    const totalCostAllHires = totalFee * numberOfHires;
    const traditionalTotalFee = annualSalary * (TRADITIONAL_FEE_PCT / 100) * numberOfHires;
    const savings = traditionalTotalFee - totalCostAllHires;
    const savingsPercent = traditionalTotalFee > 0 ? (savings / traditionalTotalFee) * 100 : 0;
    const platformFee = totalFee * PLATFORM_CUT;
    const recruiterPayout = totalFee - platformFee;
    const guaranteeCost = 0; // Guarantee is included — no extra cost

    return {
        feePercentage,
        tierLabel,
        totalFee,
        costPerHire,
        totalCostAllHires,
        traditionalTotalFee,
        savings,
        savingsPercent,
        platformFee,
        recruiterPayout,
        guaranteeCost,
    };
}

function formatSEK(amount: number): string {
    return new Intl.NumberFormat("sv-SE", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.round(amount));
}

export function RecruitmentCalculator() {
    const [isOpen, setIsOpen] = useState(false);
    const [salary, setSalary] = useState(50000);
    const [hires, setHires] = useState(1);
    const [pastPlacements, setPastPlacements] = useState(0);
    const [guaranteeMonths, setGuaranteeMonths] = useState(0);

    const results = useMemo(
        () => calculate(salary, hires, pastPlacements, guaranteeMonths),
        [salary, hires, pastPlacements, guaranteeMonths]
    );

    return (
        <div className="mx-3 mb-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    "text-muted-foreground hover:bg-muted hover:text-foreground",
                    isOpen && "bg-brand-50 text-brand-600"
                )}
            >
                <Calculator className="h-5 w-5" />
                <span className="flex-1 text-left">Kostnadsberäkning</span>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isOpen && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 shadow-lg shadow-brand-500/5 overflow-hidden">
                    {/* Inputs */}
                    <div className="p-3.5 space-y-3">
                        {/* Salary slider */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Årslön (SEK)</label>
                                <span className="text-xs font-bold text-slate-700 tabular-nums">{formatSEK(salary)} kr</span>
                            </div>
                            <input
                                type="range"
                                min={25000}
                                max={150000}
                                step={5000}
                                value={salary}
                                onChange={(e) => setSalary(Number(e.target.value))}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200 accent-brand-600"
                            />
                            <div className="flex justify-between text-[9px] text-slate-400">
                                <span>25 000</span>
                                <span>150 000</span>
                            </div>
                        </div>

                        {/* Number of hires */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Antal anställningar</label>
                                <span className="text-xs font-bold text-slate-700">{hires}</span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={10}
                                step={1}
                                value={hires}
                                onChange={(e) => setHires(Number(e.target.value))}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200 accent-brand-600"
                            />
                            <div className="flex justify-between text-[9px] text-slate-400">
                                <span>1</span>
                                <span>10</span>
                            </div>
                        </div>

                        {/* Past placements (for tier) */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tidigare placeringar (12 mån)</label>
                                <span className="text-xs font-bold text-slate-700">{pastPlacements}</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={10}
                                step={1}
                                value={pastPlacements}
                                onChange={(e) => setPastPlacements(Number(e.target.value))}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200 accent-brand-600"
                            />
                            <div className="flex justify-between text-[9px] text-slate-400">
                                <span>0</span>
                                <span>10</span>
                            </div>
                        </div>

                        {/* Guarantee period */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Garantiperiod</label>
                            <div className="flex gap-1.5">
                                {GUARANTEE_MONTHS_OPTIONS.map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setGuaranteeMonths(m)}
                                        className={cn(
                                            "flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all",
                                            guaranteeMonths === m
                                                ? "bg-brand-600 text-white shadow-sm"
                                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                        )}
                                    >
                                        {m === 0 ? "Ingen" : `${m} mån`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-slate-200" />

                    {/* Results */}
                    <div className="p-3.5 space-y-2.5">
                        {/* Tier badge */}
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Er nivå</span>
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                                results.tierLabel === "Gold" && "bg-amber-100 text-amber-700",
                                results.tierLabel === "Silver" && "bg-slate-200 text-slate-600",
                                results.tierLabel === "Standard" && "bg-brand-100 text-brand-700",
                            )}>
                                {results.tierLabel} — {results.feePercentage}%
                            </span>
                        </div>

                        {/* Cost per hire */}
                        <div className="rounded-lg bg-brand-50 border border-brand-100 p-2.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-500 mb-0.5">Kostnad per anställning</div>
                            <div className="text-lg font-black text-brand-700 leading-tight tabular-nums">
                                {formatSEK(results.costPerHire)} <span className="text-xs font-bold">SEK</span>
                            </div>
                        </div>

                        {/* Total cost */}
                        {hires > 1 && (
                            <div className="flex justify-between items-baseline px-1">
                                <span className="text-[10px] font-semibold text-slate-500">Total ({hires} st)</span>
                                <span className="text-sm font-bold text-slate-700 tabular-nums">{formatSEK(results.totalCostAllHires)} kr</span>
                            </div>
                        )}

                        {/* Guarantee included */}
                        {guaranteeMonths > 0 && (
                            <div className="flex items-center gap-1.5 px-1">
                                <Info className="h-3 w-3 text-emerald-500 shrink-0" />
                                <span className="text-[10px] text-emerald-600 font-medium">
                                    {guaranteeMonths} mån garanti ingår utan extra kostnad
                                </span>
                            </div>
                        )}

                        {/* Savings vs traditional */}
                        {results.savings > 0 && (
                            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2.5">
                                <div className="flex items-center gap-1 mb-0.5">
                                    <TrendingDown className="h-3 w-3 text-emerald-600" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                        Ni sparar vs. traditionell ({TRADITIONAL_FEE_PCT}%)
                                    </span>
                                </div>
                                <div className="text-base font-black text-emerald-700 leading-tight tabular-nums">
                                    {formatSEK(results.savings)} <span className="text-xs font-bold">SEK</span>
                                    <span className="text-[10px] font-semibold text-emerald-500 ml-1.5">
                                        ({Math.round(results.savingsPercent)}% lägre)
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Comparison bar */}
                        <div className="space-y-1 px-1 pt-1">
                            <div className="flex justify-between text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                                <span>Recruito</span>
                                <span>Traditionell</span>
                            </div>
                            <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                                <div
                                    className="bg-brand-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(results.totalCostAllHires / Math.max(results.traditionalTotalFee, 1)) * 100}%` }}
                                />
                                <div className="flex-1 bg-slate-200 rounded-full" />
                            </div>
                            <div className="flex justify-between text-[9px] tabular-nums text-slate-500">
                                <span>{formatSEK(results.totalCostAllHires)} kr</span>
                                <span>{formatSEK(results.traditionalTotalFee)} kr</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
