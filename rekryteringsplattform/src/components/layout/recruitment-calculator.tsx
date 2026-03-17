"use client";

import { useState, useMemo, useEffect } from "react";
import { TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/client";
import type { Locale } from "@/i18n/config";

// ── Currency configuration per locale ──
interface CurrencyConfig {
    code: string;
    symbol: string;
    /** Whether symbol goes before the number */
    prefix: boolean;
    /** Conversion factor from EUR (EUR = 1) */
    factor: number;
    /** Slider min in local currency */
    sliderMin: number;
    /** Slider max in local currency */
    sliderMax: number;
    /** Slider step in local currency */
    sliderStep: number;
    /** Minimum fee in local currency */
    minFee: number;
    /** Default salary in local currency */
    defaultSalary: number;
    /** Intl locale for number formatting */
    numberLocale: string;
}

const CURRENCY_BY_LOCALE: Record<Locale, CurrencyConfig> = {
    en: {
        code: "EUR",
        symbol: "€",
        prefix: true,
        factor: 1,
        sliderMin: 20_000,
        sliderMax: 120_000,
        sliderStep: 5_000,
        minFee: 3_500,
        defaultSalary: 50_000,
        numberLocale: "de-DE",
    },
    sv: {
        code: "SEK",
        symbol: "kr",
        prefix: false,
        factor: 11.49,
        sliderMin: 250_000,
        sliderMax: 1_400_000,
        sliderStep: 50_000,
        minFee: 40_000,
        defaultSalary: 550_000,
        numberLocale: "sv-SE",
    },
    da: {
        code: "DKK",
        symbol: "kr",
        prefix: false,
        factor: 7.46,
        sliderMin: 150_000,
        sliderMax: 900_000,
        sliderStep: 25_000,
        minFee: 26_000,
        defaultSalary: 375_000,
        numberLocale: "da-DK",
    },
    no: {
        code: "NOK",
        symbol: "kr",
        prefix: false,
        factor: 11.80,
        sliderMin: 250_000,
        sliderMax: 1_400_000,
        sliderStep: 50_000,
        minFee: 41_000,
        defaultSalary: 550_000,
        numberLocale: "nb-NO",
    },
};

// ── Commission Table: base commission % by annual salary (EUR) ──
const COMMISSION_TABLE_EUR: [number, number][] = [
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

// ── Industry adjustments ──
const INDUSTRIES: { label: string; adj: number }[] = [
    { label: "Automotive", adj: 2 },
    { label: "Aviation & Aerospace", adj: 4 },
    { label: "Construction & Real Estate", adj: 2 },
    { label: "Construction Materials & Infrastructure", adj: 2 },
    { label: "Education", adj: 1 },
    { label: "Energy & Utilities", adj: 3 },
    { label: "Financial Services", adj: 3 },
    { label: "FMCG", adj: 2 },
    { label: "Government & Public Sector", adj: 3 },
    { label: "Healthcare", adj: 4 },
    { label: "Hospitality & Tourism", adj: 1 },
    { label: "Insurance", adj: 2 },
    { label: "IT - Artificial Intelligence", adj: 4 },
    { label: "IT - SaaS / Software", adj: 3 },
    { label: "IT Services", adj: 2 },
    { label: "Legal Services", adj: 3 },
    { label: "Logistics & Transportation", adj: 2 },
    { label: "Manufacturing", adj: 2 },
    { label: "Medical Devices", adj: 4 },
    { label: "Oil & Gas", adj: 4 },
    { label: "Pharmaceutical", adj: 3 },
    { label: "Professional Services", adj: 2 },
    { label: "Retail & E-commerce", adj: 1 },
    { label: "Telecommunications", adj: 2 },
    { label: "Textile & Apparel", adj: 1 },
];

// ── Job Function adjustments (grouped by category) ──
interface JobFunctionGroup {
    category: string;
    functions: { label: string; adj: number }[];
}

const JOB_FUNCTION_GROUPS: JobFunctionGroup[] = [
    {
        category: "Finance & Governance",
        functions: [
            { label: "Accounting", adj: 1 },
            { label: "Finance", adj: 2 },
            { label: "Audit & Tax", adj: 2 },
            { label: "Human Resources", adj: 1 },
            { label: "Legal", adj: 3 },
            { label: "Compliance & Risk", adj: 3 },
        ],
    },
    {
        category: "Commercial & Growth",
        functions: [
            { label: "Sales", adj: 1 },
            { label: "Business Development", adj: 2 },
            { label: "Marketing", adj: 1 },
            { label: "Digital Marketing", adj: 2 },
            { label: "Customer Success", adj: 1 },
            { label: "Customer Support", adj: 0 },
        ],
    },
    {
        category: "Technology & Product",
        functions: [
            { label: "Engineering (Mech, Elec, Civil)", adj: 3 },
            { label: "Software Engineering", adj: 4 },
            { label: "IT – Infrastructure & Cloud", adj: 4 },
            { label: "IT – Cybersecurity", adj: 5 },
            { label: "Data Engineering & Analytics", adj: 5 },
            { label: "AI & Machine Learning", adj: 6 },
            { label: "Product Management", adj: 4 },
            { label: "UX/UI Design", adj: 2 },
        ],
    },
    {
        category: "Operations & Supply Chain",
        functions: [
            { label: "Business Operations", adj: 2 },
            { label: "Manufacturing Operations", adj: 2 },
            { label: "Supply Chain", adj: 2 },
            { label: "Procurement", adj: 1 },
            { label: "Logistics", adj: 1 },
            { label: "Quality Assurance", adj: 1 },
        ],
    },
    {
        category: "Specialized & Professional",
        functions: [
            { label: "Research & Development", adj: 4 },
            { label: "Clinical & Medical", adj: 5 },
            { label: "Learning & Development (L&D)", adj: 1 },
            { label: "Administration & Office Support", adj: 0 },
        ],
    },
];

// Flat list for calculation lookup
const JOB_FUNCTIONS: { label: string; adj: number }[] = JOB_FUNCTION_GROUPS.flatMap(
    (g) => g.functions,
);

// ── Level / experience adjustments ──
const LEVELS: { label: string; adj: number; years: string }[] = [
    { label: "Entry", adj: 0, years: "0–1" },
    { label: "Junior", adj: 0, years: "1–3" },
    { label: "Assistant", adj: 1, years: "3–5" },
    { label: "Manager", adj: 1.5, years: "4–7" },
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

const TRADITIONAL_FEE_PCT = 25;
const EXCLUSIVE_DISCOUNT_PCT = 10; // 10% discount on final fee for exclusive postings

/** Interpolate base commission % from the EUR commission table.
 *  salaryLocal is in the local currency; factor converts it to EUR. */
function getBaseCommission(salaryLocal: number, factor: number): number {
    const salaryEur = salaryLocal / factor;
    const table = COMMISSION_TABLE_EUR;
    if (salaryEur <= table[0][0]) return table[0][1];
    if (salaryEur >= table[table.length - 1][0]) return table[table.length - 1][1];

    for (let i = 0; i < table.length - 1; i++) {
        const [s1, c1] = table[i];
        const [s2, c2] = table[i + 1];
        if (salaryEur >= s1 && salaryEur <= s2) {
            const t = (salaryEur - s1) / (s2 - s1);
            return c1 + t * (c2 - c1);
        }
    }
    return table[0][1];
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
    currency: CurrencyConfig,
): CalcResults {
    const baseCommission = getBaseCommission(annualSalary, currency.factor);
    const levelAdj = LEVELS[levelIdx].adj;
    const functionAdj = JOB_FUNCTIONS[functionIdx].adj;
    const industryAdj = INDUSTRIES[industryIdx].adj;
    const guaranteeAdj = GUARANTEE_OPTIONS[guaranteeIdx].adj;

    const totalFeePercent = baseCommission + levelAdj + functionAdj + industryAdj + guaranteeAdj;
    const rawFee = annualSalary * (totalFeePercent / 100);
    // Exclusive discount is 10% off the final fee amount
    const exclusiveDiscount = isExclusive ? rawFee * (EXCLUSIVE_DISCOUNT_PCT / 100) : 0;
    const discountedFee = rawFee - exclusiveDiscount;
    const minFeeApplied = discountedFee < currency.minFee;
    const feePerHire = Math.max(discountedFee, currency.minFee);
    const finalFeePercent = isExclusive ? totalFeePercent * (1 - EXCLUSIVE_DISCOUNT_PCT / 100) : totalFeePercent;
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
        exclusiveDiscount: isExclusive ? totalFeePercent * (EXCLUSIVE_DISCOUNT_PCT / 100) : 0,
        finalFeePercent,
        feePerHire,
        traditionalFee,
        savings,
        savingsPercent,
        minFeeApplied,
    };
}

function fmtCurrency(n: number, currency: CurrencyConfig, decimals = 0): string {
    const formatted = new Intl.NumberFormat(currency.numberLocale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(n);
    if (currency.prefix) return `${currency.symbol}${formatted}`;
    return `${formatted} ${currency.symbol}`;
}

function fmtPct(n: number, decimals = 0): string {
    return new Intl.NumberFormat("en", {
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
    /** Callback to parent with the currency code based on locale */
    onCurrencyChange?: (currencyCode: string) => void;
}

export function RecruitmentCalculator({ embedded = false, onFeeChange, onGuaranteeChange, onCurrencyChange }: RecruitmentCalculatorProps) {
    const locale = useLocale();
    const currency = CURRENCY_BY_LOCALE[locale];

    const [salary, setSalary] = useState(currency.defaultSalary);
    const [levelIdx, setLevelIdx] = useState(2); // Assistant
    const [functionIdx, setFunctionIdx] = useState(1); // Finance
    const [industryIdx, setIndustryIdx] = useState(6); // Financial Services
    const [guaranteeIdx, setGuaranteeIdx] = useState(1); // 1 month
    const [isExclusive, setIsExclusive] = useState(true); // Default to exclusive

    // Reset salary when locale/currency changes
    useEffect(() => {
        setSalary(currency.defaultSalary);
        onCurrencyChange?.(currency.code);
    }, [currency, onCurrencyChange]);

    const r = useMemo(() => {
        const result = calculate(salary, levelIdx, functionIdx, industryIdx, guaranteeIdx, isExclusive, currency);
        onFeeChange?.(result.feePerHire);
        onGuaranteeChange?.(GUARANTEE_OPTIONS[guaranteeIdx].months);
        return result;
    }, [salary, levelIdx, functionIdx, industryIdx, guaranteeIdx, isExclusive, currency, onFeeChange, onGuaranteeChange]);

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
                                {fmtCurrency(salary, currency)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={currency.sliderMin}
                            max={currency.sliderMax}
                            step={currency.sliderStep}
                            value={salary}
                            onChange={(e) => setSalary(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200 accent-brand-600"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400">
                            <span>{fmtCurrency(currency.sliderMin, currency)}</span>
                            <span>{fmtCurrency(currency.sliderMax, currency)}</span>
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

                    {/* Job function (grouped) */}
                    <div className="space-y-1">
                        <label className={inputLabel}>Job Function</label>
                        <select
                            value={functionIdx}
                            onChange={(e) => setFunctionIdx(Number(e.target.value))}
                            className={selectStyle}
                        >
                            {(() => {
                                let idx = 0;
                                return JOB_FUNCTION_GROUPS.map((group) => (
                                    <optgroup key={group.category} label={group.category}>
                                        {group.functions.map((f) => {
                                            const currentIdx = idx++;
                                            return (
                                                <option key={f.label} value={currentIdx}>
                                                    {f.label} +{f.adj}%
                                                </option>
                                            );
                                        })}
                                    </optgroup>
                                ));
                            })()}
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
                            <div className="flex justify-between gap-2 text-slate-500">
                                <span className="truncate">Base commission</span>
                                <span className="font-semibold shrink-0">{fmtPct(r.baseCommission, 2)}%</span>
                            </div>
                            <div className="flex justify-between gap-2 text-slate-500">
                                <span className="truncate">Level ({LEVELS[levelIdx].label})</span>
                                <span className="font-semibold shrink-0">+{r.levelAdj}%</span>
                            </div>
                            <div className="flex justify-between gap-2 text-slate-500">
                                <span className="truncate">Function ({JOB_FUNCTIONS[functionIdx].label})</span>
                                <span className="font-semibold shrink-0">+{r.functionAdj}%</span>
                            </div>
                            <div className="flex justify-between gap-2 text-slate-500">
                                <span className="truncate">Industry ({INDUSTRIES[industryIdx].label})</span>
                                <span className="font-semibold shrink-0">+{r.industryAdj}%</span>
                            </div>
                            <div className="flex justify-between gap-2 text-slate-500">
                                <span className="truncate">Guarantee ({GUARANTEE_OPTIONS[guaranteeIdx].months} mo)</span>
                                <span className="font-semibold shrink-0">+{r.guaranteeAdj}%</span>
                            </div>
                            {isExclusive && (
                                <div className="flex justify-between gap-2 text-emerald-600">
                                    <span className="truncate">Exclusive discount</span>
                                    <span className="font-semibold shrink-0">–{fmtPct(r.exclusiveDiscount, 2)}%</span>
                                </div>
                            )}
                            <div className="h-px bg-slate-200 my-1" />
                            <div className="flex justify-between gap-2 font-bold text-slate-700 text-[11px]">
                                <span>Total fee</span>
                                <span>{fmtPct(r.finalFeePercent, 2)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Final fee */}
                    <div className="rounded-lg bg-brand-50 border border-brand-100 p-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-brand-500 mb-0.5">
                            Recruitment Fee
                        </div>
                        <div className="text-lg font-black text-brand-700 leading-tight tabular-nums">
                            {fmtCurrency(r.feePerHire, currency)} <span className="text-xs font-bold">{currency.code}</span>
                        </div>
                        {r.minFeeApplied && (
                            <div className="text-[9px] text-brand-500 mt-0.5">
                                Minimum fee of {fmtCurrency(currency.minFee, currency)} applies
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
                                {fmtCurrency(r.savings, currency)}{" "}
                                <span className="text-xs font-bold">{currency.code}</span>
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
                            <span>{fmtCurrency(r.feePerHire, currency)}</span>
                            <span>{fmtCurrency(r.traditionalFee, currency)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
