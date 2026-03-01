"use client";

import { useState, useMemo } from "react";
import { Calculator, ChevronDown, ChevronUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Commission Table: base commission % by monthly salary ──
const COMMISSION_TABLE: [number, number][] = [
    [20_000, 11.00],
    [25_000, 10.75],
    [30_000, 10.50],
    [35_000, 10.25],
    [40_000, 10.00],
    [45_000, 9.75],
    [50_000, 9.50],
    [55_000, 9.25],
    [60_000, 9.00],
    [65_000, 8.75],
    [70_000, 8.50],
    [75_000, 8.25],
    [80_000, 8.00],
    [85_000, 7.75],
    [90_000, 7.50],
    [95_000, 7.25],
    [100_000, 7.00],
    [105_000, 6.75],
    [110_000, 6.50],
    [120_000, 6.25],
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

// ── Guarantee adjustments ──
const GUARANTEE_OPTIONS: { months: number; adj: number }[] = [
    { months: 0, adj: 0 },
    { months: 1, adj: 1 },
    { months: 2, adj: 2 },
    { months: 3, adj: 3 },
];

const MIN_FEE = 3_500;
const TRADITIONAL_FEE_PCT = 25;

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
    guaranteeAdj: number;
    totalFeePercent: number;
    feePerHire: number;
    totalFee: number;
    traditionalFee: number;
    savings: number;
    savingsPercent: number;
    minFeeApplied: boolean;
}

function calculate(
    annualSalary: number,
    levelIdx: number,
    functionIdx: number,
    guaranteeIdx: number,
    hires: number,
): CalcResults {
    const baseCommission = getBaseCommission(annualSalary);
    const levelAdj = LEVELS[levelIdx].adj;
    const functionAdj = JOB_FUNCTIONS[functionIdx].adj;
    const guaranteeAdj = GUARANTEE_OPTIONS[guaranteeIdx].adj;

    const totalFeePercent = baseCommission + levelAdj + functionAdj + guaranteeAdj;
    const rawFee = annualSalary * (totalFeePercent / 100);
    const minFeeApplied = rawFee < MIN_FEE;
    const feePerHire = Math.max(rawFee, MIN_FEE);
    const totalFee = feePerHire * hires;
    const traditionalFee = annualSalary * (TRADITIONAL_FEE_PCT / 100) * hires;
    const savings = traditionalFee - totalFee;
    const savingsPercent = traditionalFee > 0 ? (savings / traditionalFee) * 100 : 0;

    return {
        baseCommission,
        levelAdj,
        functionAdj,
        guaranteeAdj,
        totalFeePercent,
        feePerHire,
        totalFee,
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

export function RecruitmentCalculator() {
    const [isOpen, setIsOpen] = useState(false);
    const [salary, setSalary] = useState(35_000);
    const [levelIdx, setLevelIdx] = useState(2); // Assistant
    const [functionIdx, setFunctionIdx] = useState(1); // Business Dev
    const [guaranteeIdx, setGuaranteeIdx] = useState(1); // 1 month
    const [hires, setHires] = useState(1);

    const r = useMemo(
        () => calculate(salary, levelIdx, functionIdx, guaranteeIdx, hires),
        [salary, levelIdx, functionIdx, guaranteeIdx, hires],
    );

    return (
        <div className="mx-3 mb-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    "text-muted-foreground hover:bg-muted hover:text-foreground",
                    isOpen && "bg-brand-50 text-brand-600",
                )}
            >
                <Calculator className="h-5 w-5" />
                <span className="flex-1 text-left">Avgiftsberäkning</span>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isOpen && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 shadow-lg shadow-brand-500/5 overflow-hidden">
                    {/* ── Inputs ── */}
                    <div className="p-3.5 space-y-3">
                        {/* Annual salary */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Årslön
                                </label>
                                <span className="text-xs font-bold text-slate-700 tabular-nums">
                                    {fmt(salary)} kr
                                </span>
                            </div>
                            <input
                                type="range"
                                min={20_000}
                                max={140_000}
                                step={1_000}
                                value={salary}
                                onChange={(e) => setSalary(Number(e.target.value))}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200 accent-brand-600"
                            />
                            <div className="flex justify-between text-[9px] text-slate-400">
                                <span>20 000</span>
                                <span>140 000</span>
                            </div>
                        </div>

                        {/* Level */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Nivå
                            </label>
                            <select
                                value={levelIdx}
                                onChange={(e) => setLevelIdx(Number(e.target.value))}
                                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            >
                                {LEVELS.map((l, i) => (
                                    <option key={l.label} value={i}>
                                        {l.label} ({l.years} år) +{l.adj}%
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Job function */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Jobbfunktion
                            </label>
                            <select
                                value={functionIdx}
                                onChange={(e) => setFunctionIdx(Number(e.target.value))}
                                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Garanti
                            </label>
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
                                        {g.months === 0 ? "Ingen" : `${g.months} mån`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Number of hires */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Antal anställningar
                                </label>
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
                    </div>

                    {/* ── Divider ── */}
                    <div className="h-px bg-slate-200" />

                    {/* ── Results ── */}
                    <div className="p-3.5 space-y-2.5">
                        {/* Fee breakdown */}
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Beräkning
                            </span>
                            <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 space-y-0.5 text-[10px] tabular-nums">
                                <div className="flex justify-between text-slate-500">
                                    <span>Basavgift</span>
                                    <span className="font-semibold">{fmt(r.baseCommission, 2)}%</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                    <span>Nivåjustering ({LEVELS[levelIdx].label})</span>
                                    <span className="font-semibold">+{r.levelAdj}%</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                    <span>Funktion ({JOB_FUNCTIONS[functionIdx].label})</span>
                                    <span className="font-semibold">+{r.functionAdj}%</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                    <span>Garanti ({GUARANTEE_OPTIONS[guaranteeIdx].months} mån)</span>
                                    <span className="font-semibold">+{r.guaranteeAdj}%</span>
                                </div>
                                <div className="h-px bg-slate-200 my-1" />
                                <div className="flex justify-between font-bold text-slate-700 text-[11px]">
                                    <span>Total avgift</span>
                                    <span>{fmt(r.totalFeePercent, 2)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Final fee */}
                        <div className="rounded-lg bg-brand-50 border border-brand-100 p-2.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-500 mb-0.5">
                                Rekryteringsavgift{hires > 1 ? ` (per st)` : ""}
                            </div>
                            <div className="text-lg font-black text-brand-700 leading-tight tabular-nums">
                                {fmt(r.feePerHire)} <span className="text-xs font-bold">SEK</span>
                            </div>
                            {r.minFeeApplied && (
                                <div className="text-[9px] text-brand-500 mt-0.5">
                                    Minimiavgift 3 500 kr tillämpas
                                </div>
                            )}
                        </div>

                        {/* Total for multiple hires */}
                        {hires > 1 && (
                            <div className="flex justify-between items-baseline px-1">
                                <span className="text-[10px] font-semibold text-slate-500">
                                    Total ({hires} st)
                                </span>
                                <span className="text-sm font-bold text-slate-700 tabular-nums">
                                    {fmt(r.totalFee)} kr
                                </span>
                            </div>
                        )}

                        {/* Savings vs traditional */}
                        {r.savings > 0 && (
                            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2.5">
                                <div className="flex items-center gap-1 mb-0.5">
                                    <TrendingDown className="h-3 w-3 text-emerald-600" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                        Besparing vs. traditionell ({TRADITIONAL_FEE_PCT}%)
                                    </span>
                                </div>
                                <div className="text-base font-black text-emerald-700 leading-tight tabular-nums">
                                    {fmt(r.savings)}{" "}
                                    <span className="text-xs font-bold">SEK</span>
                                    <span className="text-[10px] font-semibold text-emerald-500 ml-1.5">
                                        ({Math.round(r.savingsPercent)}% lägre)
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
                                    style={{
                                        width: `${(r.totalFee / Math.max(r.traditionalFee, 1)) * 100}%`,
                                    }}
                                />
                                <div className="flex-1 bg-slate-200 rounded-full" />
                            </div>
                            <div className="flex justify-between text-[9px] tabular-nums text-slate-500">
                                <span>{fmt(r.totalFee)} kr</span>
                                <span>{fmt(r.traditionalFee)} kr</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
