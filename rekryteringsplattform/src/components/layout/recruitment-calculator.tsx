"use client";

import { useState, useMemo } from "react";
import { TrendingDown } from "lucide-react";
import {
    cn,
    calculateClientFee,
    CLIENT_FEE_BASE_PCT,
    CLIENT_FEE_EXCLUSIVE_BASE_PCT,
    CLIENT_FEE_GUARANTEE_PCT,
    RECRUITER_FEE_DEFAULT_PCT,
} from "@/lib/utils";
import {
    SUPPORTED_CURRENCIES,
    CURRENCY_CONFIG,
    clampSalaryToCurrency,
    formatMoney,
    type Currency,
} from "@/lib/currency-config";
import { useTranslations } from "@/i18n/client";

// Canonical fee constants live in lib/utils.ts (same formula that locks fees
// on job rows); per-currency minimums/slider bounds in lib/currency-config.ts.
const GUARANTEE_ADJ = CLIENT_FEE_GUARANTEE_PCT;       // +1% per guarantee month
const RECRUITER_PCT = RECRUITER_FEE_DEFAULT_PCT;      // 7% of annual salary (default, manually adjusted by Recruito)
const TRADITIONAL_FEE_PCT = 25; // for savings comparison (marketing-only)

const GUARANTEE_OPTIONS = [0, 1, 2] as const;

interface CalcResults {
    baseCommission: number;
    commission: number;
    clientFee: number;
    recruiterFee: number;
    recruitorRevenue: number;
    totalClientFee: number;
    minFeeApplied: boolean;
    traditionalFee: number;
    savings: number;
    savingsPercent: number;
}

function calculate(
    annualSalary: number,
    guaranteeMonths: 0 | 1 | 2,
    isExclusive: boolean,
    hires: number,
    currency: Currency,
): CalcResults {
    // Exclusive is its own flat rate (10/11/12%), standard is 11/12/13%.
    const baseCommission = isExclusive ? CLIENT_FEE_EXCLUSIVE_BASE_PCT : CLIENT_FEE_BASE_PCT;
    const commission = baseCommission + guaranteeMonths * GUARANTEE_ADJ;

    const clientFee = calculateClientFee(annualSalary, guaranteeMonths, isExclusive, currency);
    const minFeeApplied = annualSalary * commission < CURRENCY_CONFIG[currency].minFee;
    const recruiterFee = annualSalary * RECRUITER_PCT;
    const recruitorRevenue = clientFee - recruiterFee;
    const totalClientFee = clientFee * hires;
    const traditionalFee = annualSalary * (TRADITIONAL_FEE_PCT / 100) * hires;
    const savings = traditionalFee - totalClientFee;
    const savingsPercent = traditionalFee > 0 ? (savings / traditionalFee) * 100 : 0;

    return {
        baseCommission,
        commission,
        clientFee,
        recruiterFee,
        recruitorRevenue,
        totalClientFee,
        minFeeApplied,
        traditionalFee,
        savings,
        savingsPercent,
    };
}

function fmt(n: number, decimals = 0): string {
    return new Intl.NumberFormat("sv-SE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(n);
}

export interface CalculatorState {
    salary: number;
    guaranteeMonths: 0 | 1 | 2;
    isExclusive: boolean;
    hires: number;
    currency: Currency;
}

export const CALCULATOR_DEFAULTS: CalculatorState = {
    salary: 44_000,
    guaranteeMonths: 0,
    isExclusive: false,
    hires: 1,
    currency: "EUR",
};

interface RecruitmentCalculatorProps {
    state?: CalculatorState;
    onStateChange?: (state: CalculatorState) => void;
}

export function RecruitmentCalculator({ state, onStateChange }: RecruitmentCalculatorProps) {
    const { t } = useTranslations();
    const [localSalary, setLocalSalary] = useState(CALCULATOR_DEFAULTS.salary);
    const [localGuaranteeMonths, setLocalGuaranteeMonths] = useState<0 | 1 | 2>(CALCULATOR_DEFAULTS.guaranteeMonths);
    const [localIsExclusive, setLocalIsExclusive] = useState(CALCULATOR_DEFAULTS.isExclusive);
    const [localHires, setLocalHires] = useState(CALCULATOR_DEFAULTS.hires);
    const [localCurrency, setLocalCurrency] = useState(CALCULATOR_DEFAULTS.currency);

    // Use controlled state if provided, otherwise local state
    const salary = state?.salary ?? localSalary;
    const guaranteeMonths = state?.guaranteeMonths ?? localGuaranteeMonths;
    const isExclusive = state?.isExclusive ?? localIsExclusive;
    const hires = state?.hires ?? localHires;
    const currency = state?.currency ?? localCurrency;

    const setSalary = (v: number) => {
        if (onStateChange && state) onStateChange({ ...state, salary: v });
        else setLocalSalary(v);
    };
    const setGuaranteeMonths = (v: 0 | 1 | 2) => {
        if (onStateChange && state) onStateChange({ ...state, guaranteeMonths: v });
        else setLocalGuaranteeMonths(v);
    };
    const setIsExclusive = (v: boolean) => {
        if (onStateChange && state) onStateChange({ ...state, isExclusive: v });
        else setLocalIsExclusive(v);
    };
    const setHires = (v: number) => {
        if (onStateChange && state) onStateChange({ ...state, hires: v });
        else setLocalHires(v);
    };
    // Currency switch clamps the salary into the new currency's range (never
    // converts) — one combined update so the salary change can't be lost when
    // the parent controls the state.
    const setCurrency = (v: Currency) => {
        const clamped = clampSalaryToCurrency(salary, v);
        if (onStateChange && state) onStateChange({ ...state, currency: v, salary: clamped });
        else {
            setLocalCurrency(v);
            setLocalSalary(clamped);
        }
    };

    const r = useMemo(
        () => calculate(salary, guaranteeMonths, isExclusive, hires, currency),
        [salary, guaranteeMonths, isExclusive, hires, currency],
    );

    const { minSalary: sliderMin, maxSalary: sliderMax, step: sliderStep } = CURRENCY_CONFIG[currency];
    const minLabel = formatMoney(sliderMin, currency);
    const maxLabel = formatMoney(sliderMax, currency);

    return (
        <div className="mx-0 mt-1 mb-1">
            <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 shadow-lg shadow-brand-500/5 overflow-hidden">
                {/* ── Inputs ── */}
                <div className="p-3.5 space-y-3">
                    {/* Annual salary */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-baseline gap-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {t("calculator.annualSalary")}
                            </label>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-700 tabular-nums">
                                    {fmt(salary)}
                                </span>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value as Currency)}
                                    className="text-[10px] font-bold text-slate-600 bg-slate-100 border-0 rounded px-1 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-400"
                                >
                                    {SUPPORTED_CURRENCIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <input
                            type="range"
                            min={sliderMin}
                            max={sliderMax}
                            step={sliderStep}
                            value={Math.min(Math.max(salary, sliderMin), sliderMax)}
                            onChange={(e) => setSalary(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200 accent-brand-600"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400">
                            <span>{minLabel}</span>
                            <span>{maxLabel}</span>
                        </div>
                    </div>

                    {/* Guarantee months */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {t("calculator.guarantee")}
                        </label>
                        <div className="flex gap-1.5">
                            {GUARANTEE_OPTIONS.map((months) => (
                                <button
                                    key={months}
                                    onClick={() => setGuaranteeMonths(months)}
                                    className={cn(
                                        "flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all",
                                        guaranteeMonths === months
                                            ? "bg-brand-600 text-white shadow-sm"
                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                                    )}
                                >
                                    {months === 0 ? t("calculator.none") : `${months} ${t("calculator.months")}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Job type */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {t("calculator.assignmentType")}
                        </label>
                        <div className="flex gap-1.5">
                            {[
                                { label: "Standard", value: false },
                                { label: "Exclusive", value: true },
                            ].map(({ label, value }) => (
                                <button
                                    key={label}
                                    onClick={() => setIsExclusive(value)}
                                    className={cn(
                                        "flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all",
                                        isExclusive === value
                                            ? "bg-brand-600 text-white shadow-sm"
                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {isExclusive && (
                            <p className="text-[9px] text-brand-500 font-semibold">
                                {t("calculator.exclusiveRateNote")}
                            </p>
                        )}
                    </div>

                    {/* Number of hires */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-baseline">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {t("calculator.numberOfHires")}
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
                            {t("calculator.calculation")}
                        </span>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 space-y-0.5 text-[10px] tabular-nums">
                            <div className="flex justify-between text-slate-500">
                                <span>{t(isExclusive ? "calculator.exclusiveRateLabel" : "calculator.baseFee")}</span>
                                <span className="font-semibold">{fmt(r.baseCommission * 100, 0)}%</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>{t("calculator.guarantee")} ({guaranteeMonths} {t("calculator.months")})</span>
                                <span className="font-semibold">+{guaranteeMonths}%</span>
                            </div>
                            <div className="h-px bg-slate-200 my-1" />
                            <div className="flex justify-between font-bold text-slate-700 text-[11px]">
                                <span>{t("calculator.commission")}</span>
                                <span>{fmt(r.commission * 100, 0)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Client fee */}
                    <div className="rounded-lg bg-brand-50 border border-brand-100 p-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-brand-500 mb-0.5">
                            {t("calculator.recruitmentFeeClient")}{hires > 1 ? ` — ${t("calculator.perUnit")}` : ""}
                        </div>
                        <div className="text-lg font-black text-brand-700 leading-tight tabular-nums">
                            {fmt(r.clientFee)} <span className="text-xs font-bold">{currency}</span>
                        </div>
                        {r.minFeeApplied && (
                            <div className="text-[9px] text-brand-500 mt-0.5">
                                {t("calculator.minFeeApplied").replace("{amount}", formatMoney(CURRENCY_CONFIG[currency].minFee, currency))}
                            </div>
                        )}
                        <div className="text-[9px] text-slate-500 mt-1.5 leading-snug">
                            {t("calculator.estimateDisclaimer")}
                        </div>
                    </div>

                    {/* Total for multiple hires */}
                    {hires > 1 && (
                        <div className="flex justify-between items-baseline px-1">
                            <span className="text-[10px] font-semibold text-slate-500">
                                {t("calculator.totalClient")} ({hires} {t("calculator.perUnit")})
                            </span>
                            <span className="text-sm font-bold text-slate-700 tabular-nums">
                                {fmt(r.totalClientFee)} {currency}
                            </span>
                        </div>
                    )}

                    {/* Savings vs traditional */}
                    {r.savings > 0 && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2.5">
                            <div className="flex items-center gap-1 mb-0.5">
                                <TrendingDown className="h-3 w-3 text-emerald-600" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                    {t("calculator.savingsVsTraditional")} ({TRADITIONAL_FEE_PCT}%)
                                </span>
                            </div>
                            <div className="text-base font-black text-emerald-700 leading-tight tabular-nums">
                                {fmt(r.savings)} {currency}
                                <span className="text-[10px] font-semibold text-emerald-500 ml-1.5">
                                    ({Math.round(r.savingsPercent)}% {t("calculator.lower")})
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Comparison bar */}
                    <div className="space-y-1 px-1 pt-1">
                        <div className="flex justify-between text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                            <span>Recruito</span>
                            <span>{t("calculator.traditional")}</span>
                        </div>
                        <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                            <div
                                className="bg-brand-500 rounded-full transition-all duration-500"
                                style={{
                                    width: `${(r.totalClientFee / Math.max(r.traditionalFee, 1)) * 100}%`,
                                }}
                            />
                            <div className="flex-1 bg-slate-200 rounded-full" />
                        </div>
                        <div className="flex justify-between text-[9px] tabular-nums text-slate-500">
                            <span>{fmt(r.totalClientFee)} {currency}</span>
                            <span>{fmt(r.traditionalFee)} {currency}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
