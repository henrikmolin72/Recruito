"use client";

import { useState, useMemo } from "react";
import { TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Commission Table: base commission % by annual salary (SEK) ──
const COMMISSION_TABLE: [number, number][] = [
    [250_000, 11.00],
    [300_000, 10.75],
    [350_000, 10.50],
    [400_000, 10.25],
    [450_000, 10.00],
    [500_000, 9.75],
    [550_000, 9.50],
    [600_000, 9.25],
    [700_000, 9.00],
    [750_000, 8.75],
    [800_000, 8.50],
    [850_000, 8.25],
    [900_000, 8.00],
    [950_000, 7.75],
    [1_000_000, 7.50],
    [1_050_000, 7.25],
    [1_100_000, 7.00],
    [1_200_000, 6.75],
    [1_300_000, 6.50],
    [1_400_000, 6.25],
];

// ── Industry adjustments ──
const INDUSTRIES: { label: string; adj: number }[] = [
    { label: "IT & Software", adj: 3 },
    { label: "Finance & Banking", adj: 3 },
    { label: "Healthcare & Life Sciences", adj: 4 },
    { label: "Manufacturing", adj: 2 },
    { label: "Retail & E-commerce", adj: 1 },
    { label: "Energy & Utilities", adj: 3 },
    { label: "Telecommunications", adj: 3 },
    { label: "Construction & Real Estate", adj: 2 },
    { label: "Education", adj: 1 },
    { label: "Consulting & Professional Services", adj: 3 },
    { label: "Logistics & Transportation", adj: 2 },
    { label: "Media & Entertainment", adj: 2 },
    { label: "Government & Public Sector", adj: 1 },
    { label: "Automotive", adj: 3 },
    { label: "Hospitality & Tourism", adj: 1 },
    { label: "Legal", adj: 4 },
    { label: "Agriculture & Food", adj: 1 },
    { label: "Other", adj: 2 },
];

// ── Job Function adjustments ──
const JOB_FUNCTIONS: { label: string; adj: number }[] = [
    { label: "Accounting", adj: 3 },
    { label: "Business Development", adj: 3 },
    { label: "Construction", adj: 4 },
    { label: "Customer Support", adj: 1 },
    { label: "Education", adj: 2 },
    { label: "Engineering", adj: 5 },
    { label: "Finance", adj: 4 },
    { label: "Healthcare Provider", adj: 5 },
    { label: "Human Resources", adj: 2 },
    { label: "Information Technology", adj: 6 },
    { label: "IT — Cybersecurity", adj: 7 },
    { label: "IT — Data & AI", adj: 7 },
    { label: "Legal", adj: 5 },
    { label: "Logistics", adj: 2 },
    { label: "Management", adj: 4 },
    { label: "Manufacturing", adj: 3 },
    { label: "Marketing", adj: 3 },
    { label: "Operations", adj: 2 },
    { label: "Procurement", adj: 2 },
    { label: "Product Management", adj: 5 },
    { label: "Quality Assurance", adj: 3 },
    { label: "Research & Development", adj: 6 },
    { label: "Sales", adj: 2 },
    { label: "Supply Chain", adj: 3 },
    { label: "UX/UI Design", adj: 4 },
];

// ── Level / experience adjustments ──
const LEVELS: { label: string; adj: number; years: string }[] = [
    { label: "Entry", adj: 0, years: "0–1" },
    { label: "Junior", adj: 0, years: "1–3" },
    { label: "Assistant", adj: 0, years: "3–5" },
    { label: "Manager", adj: 1, years: "4–7" },
    { label: "Senior Manager", adj: 2, years: "8–10" },
    { label: "GM", adj: 2, years: "12–18" },
    { label: "Director", adj: 3, years: "15–20" },
    { label: "Executive", adj: 3, years: "18+" },
];

// ── Guarantee adjustments (fixed at max 2 months) ──
const GUARANTEE_OPTIONS: { months: number; adj: number }[] = [
    { months: 0, adj: 0 },
    { months: 1, adj: 1 },
    { months: 2, adj: 2 },
];

const MIN_FEE = 40_000; // SEK (≈ 3,500 EUR)
const TRADITIONAL_FEE_PCT = 25;
const EXCLUSIVE_DISCOUNT_PCT = 10; // 10% discount for exclusive postings

/** Interpolate base commission % from the commission table */
function getBaseCommission(salary: number): number {
    if (salary <= COMMISSION_TABLE[0][0]) return COMMISSION_TABLE[0][1];
    if (salary >= COMMISSION_TABLE[COMMISSION_TABLE.length - 1][0])
        return COMMISSION_TABLE[COMMISSION_TABLE.length - 1][1];

    for (let i = 0; i < COMMISSION_TABLE.length - 1; i++) {
        const [s1, c1] = COMMISSION_TABLE[i];
        const [s2, c2] = COMMISSION_TABLE[i + 1];
        if (salary >= s1 && salary <= s2) {
            const t = (salary - s1) / (s2 - s1);
            return c1 + t * (c2 - c1);
        }
    }
    return COMMISSION_TABLE[0][1];
}

interface CalcResults {
    baseCommission: number;
    levelAdj: number;
    functionAdj: number;
    industryAdj: number;
    guaranteeAdj: number;
    totalFeePercent: number;
    exclusiveDiscount: number;
    finalFeePercent: number;
    feePerHire: number;
    traditionalFee: number;
    savings: number;
    savingsPercent: number;
    minFeeApplied: boolean;
}

function calculate(
    annualSalary: number,
    levelIdx: number,
    functionIdx: number,
    industryIdx: number,
    guaranteeIdx: number,
    isExclusive: boolean,
): CalcResults {
    const baseCommission = getBaseCommission(annualSalary);
    const levelAdj = LEVELS[levelIdx].adj;
    const functionAdj = JOB_FUNCTIONS[functionIdx].adj;
    const industryAdj = INDUSTRIES[industryIdx].adj;
    const guaranteeAdj = GUARANTEE_OPTIONS[guaranteeIdx].adj;

    const totalFeePercent = baseCommission + levelAdj + functionAdj + industryAdj + guaranteeAdj;
    const exclusiveDiscount = isExclusive ? totalFeePercent * (EXCLUSIVE_DISCOUNT_PCT / 100) : 0;
    const finalFeePercent = totalFeePercent - exclusiveDiscount;
    const rawFee = annualSalary * (finalFeePercent / 100);
    const minFeeApplied = rawFee < MIN_FEE;
    const feePerHire = Math.max(rawFee, MIN_FEE);
    const traditionalFee = annualSalary * (TRADITIONAL_FEE_PCT / 100);
    const savings = traditionalFee - feePerHire;
    const savingsPercent = traditionalFee > 0 ? (savings / traditionalFee) * 100 : 0;

    return {
        baseCommission,
        levelAdj,
        functionAdj,
        industryAdj,
        guaranteeAdj,
        totalFeePercent,
        exclusiveDiscount,
        finalFeePercent,
        feePerHire,
        traditionalFee,
        savings,
        savingsPercent,
        minFeeApplied,
    };
}

function fmt(n: number, decimals = 0): string {
    return new Intl.NumberFormat("sv-SE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(n);
}

interface RecruitmentCalculatorProps {
    /** Compact mode for embedding inside job form */
    embedded?: boolean;
    /** Callback to parent with current estimated fee */
    onFeeChange?: (fee: number) => void;
    /** Callback to parent with selected guarantee months */
    onGuaranteeChange?: (months: number) => void;
}

export function RecruitmentCalculator({ embedded = false, onFeeChange, onGuaranteeChange }: RecruitmentCalculatorProps) {
    const [salary, setSalary] = useState(400_000);
    const [levelIdx, setLevelIdx] = useState(2); // Assistant
    const [functionIdx, setFunctionIdx] = useState(1); // Business Dev
    const [industryIdx, setIndustryIdx] = useState(0); // IT & Software
    const [guaranteeIdx, setGuaranteeIdx] = useState(1); // 1 month
    const [isExclusive, setIsExclusive] = useState(true); // Default to exclusive

    const r = useMemo(() => {
        const result = calculate(salary, levelIdx, functionIdx, industryIdx, guaranteeIdx, isExclusive);
        onFeeChange?.(result.feePerHire);
        onGuaranteeChange?.(GUARANTEE_OPTIONS[guaranteeIdx].months);
        return result;
    }, [salary, levelIdx, functionIdx, industryIdx, guaranteeIdx, isExclusive, onFeeChange, onGuaranteeChange]);

    const inputLabel = "text-[10px] font-bold uppercase tracking-wider text-slate-500";
    const selectStyle = "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500";

    return (
        <div className={embedded ? "" : "mx-0 mt-1 mb-1"}>
            <div className={cn(
                "rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 shadow-lg shadow-brand-500/5 overflow-hidden",
                embedded && "shadow-none"
            )}>
                {/* ── Inputs ── */}
                <div className={cn("space-y-3", embedded ? "p-4" : "p-3.5")}>
                    {/* Job Post Type: Exclusive vs Standard */}
                    <div className="space-y-1">
                        <label className={inputLabel}>Job Post Type</label>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setIsExclusive(true)}
                                className={cn(
                                    "flex-1 py-2 rounded-md text-[11px] font-semibold transition-all text-center",
                                    isExclusive
                                        ? "bg-brand-600 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                                )}
                            >
                                Exclusive (–10%)
                            </button>
                            <button
                                onClick={() => setIsExclusive(false)}
                                className={cn(
                                    "flex-1 py-2 rounded-md text-[11px] font-semibold transition-all text-center",
                                    !isExclusive
                                        ? "bg-brand-600 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                                )}
                            >
                                Standard
                            </button>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                            {isExclusive
                                ? "Exclusive: posted only on Recruito — 10% discount on final fee"
                                : "Standard: posting on multiple job sites"}
                        </p>
                    </div>

                    {/* Industry */}
                    <div className="space-y-1">
                        <label className={inputLabel}>Industry</label>
                        <select
                            value={industryIdx}
                            onChange={(e) => setIndustryIdx(Number(e.target.value))}
                            className={selectStyle}
                        >
                            {INDUSTRIES.map((ind, i) => (
                                <option key={ind.label} value={i}>
                                    {ind.label} +{ind.adj}%
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Annual salary */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-baseline">
                            <label className={inputLabel}>Annual Salary</label>
                            <span className="text-xs font-bold text-slate-700 tabular-nums">
                                {fmt(salary)} kr
                            </span>
                        </div>
                        <input
                            type="range"
                            min={250_000}
                            max={1_500_000}
                            step={25_000}
                            value={salary}
                            onChange={(e) => setSalary(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200 accent-brand-600"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400">
                            <span>250 000</span>
                            <span>1 500 000</span>
                        </div>
                    </div>

                    {/* Level */}
                    <div className="space-y-1">
                        <label className={inputLabel}>Level</label>
                        <select
                            value={levelIdx}
                            onChange={(e) => setLevelIdx(Number(e.target.value))}
                            className={selectStyle}
                        >
                            {LEVELS.map((l, i) => (
                                <option key={l.label} value={i}>
                                    {l.label} ({l.years} yrs) +{l.adj}%
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Job function */}
                    <div className="space-y-1">
                        <label className={inputLabel}>Job Function</label>
                        <select
                            value={functionIdx}
                            onChange={(e) => setFunctionIdx(Number(e.target.value))}
                            className={selectStyle}
                        >
                            {JOB_FUNCTIONS.map((f, i) => (
                                <option key={f.label} value={i}>
                                    {f.label} +{f.adj}%
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Guarantee */}
                    <div className="space-y-1">
                        <label className={inputLabel}>Guarantee</label>
                        <div className="flex gap-1.5">
                            {GUARANTEE_OPTIONS.map((g, i) => (
                                <button
                                    key={g.months}
                                    onClick={() => setGuaranteeIdx(i)}
                                    className={cn(
                                        "flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all",
                                        guaranteeIdx === i
                                            ? "bg-brand-600 text-white shadow-sm"
                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                                    )}
                                >
                                    {g.months === 0 ? "None" : `${g.months} mo`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Divider ── */}
                <div className="h-px bg-slate-200" />

                {/* ── Results ── */}
                <div className={cn("space-y-2.5", embedded ? "p-4" : "p-3.5")}>
                    {/* Fee breakdown */}
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Calculation
                        </span>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 space-y-0.5 text-[10px] tabular-nums">
                            <div className="flex justify-between text-slate-500">
                                <span>Base commission</span>
                                <span className="font-semibold">{fmt(r.baseCommission, 2)}%</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>Level ({LEVELS[levelIdx].label})</span>
                                <span className="font-semibold">+{r.levelAdj}%</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>Function ({JOB_FUNCTIONS[functionIdx].label})</span>
                                <span className="font-semibold">+{r.functionAdj}%</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>Industry ({INDUSTRIES[industryIdx].label})</span>
                                <span className="font-semibold">+{r.industryAdj}%</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>Guarantee ({GUARANTEE_OPTIONS[guaranteeIdx].months} mo)</span>
                                <span className="font-semibold">+{r.guaranteeAdj}%</span>
                            </div>
                            {isExclusive && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>Exclusive discount</span>
                                    <span className="font-semibold">–{fmt(r.exclusiveDiscount, 2)}%</span>
                                </div>
                            )}
                            <div className="h-px bg-slate-200 my-1" />
                            <div className="flex justify-between font-bold text-slate-700 text-[11px]">
                                <span>Total fee</span>
                                <span>{fmt(r.finalFeePercent, 2)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Final fee */}
                    <div className="rounded-lg bg-brand-50 border border-brand-100 p-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-brand-500 mb-0.5">
                            Recruitment Fee
                        </div>
                        <div className="text-lg font-black text-brand-700 leading-tight tabular-nums">
                            {fmt(r.feePerHire)} <span className="text-xs font-bold">SEK</span>
                        </div>
                        {r.minFeeApplied && (
                            <div className="text-[9px] text-brand-500 mt-0.5">
                                Minimum fee of 40 000 kr applies
                            </div>
                        )}
                    </div>

                    {/* Multi-hire discount note */}
                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-2 text-[10px] text-amber-700">
                        An additional discount may be offered if more than one candidate is hired for the same position. Exact discount adjusted on a client-by-client basis.
                    </div>

                    {/* Savings vs traditional */}
                    {r.savings > 0 && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2.5">
                            <div className="flex items-center gap-1 mb-0.5">
                                <TrendingDown className="h-3 w-3 text-emerald-600" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                    Savings vs. traditional ({TRADITIONAL_FEE_PCT}%)
                                </span>
                            </div>
                            <div className="text-base font-black text-emerald-700 leading-tight tabular-nums">
                                {fmt(r.savings)}{" "}
                                <span className="text-xs font-bold">SEK</span>
                                <span className="text-[10px] font-semibold text-emerald-500 ml-1.5">
                                    ({Math.round(r.savingsPercent)}% lower)
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Comparison bar */}
                    <div className="space-y-1 px-1 pt-1">
                        <div className="flex justify-between text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                            <span>Recruito</span>
                            <span>Traditional</span>
                        </div>
                        <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                            <div
                                className="bg-brand-500 rounded-full transition-all duration-500"
                                style={{
                                    width: `${(r.feePerHire / Math.max(r.traditionalFee, 1)) * 100}%`,
                                }}
                            />
                            <div className="flex-1 bg-slate-200 rounded-full" />
                        </div>
                        <div className="flex justify-between text-[9px] tabular-nums text-slate-500">
                            <span>{fmt(r.feePerHire)} kr</span>
                            <span>{fmt(r.traditionalFee)} kr</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
