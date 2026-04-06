"use client";

import { useState, useMemo } from "react";
import { TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_FEE = 3_500;          // EUR
const BASE_COMMISSION = 0.11;   // 11%
const GUARANTEE_ADJ = 0.01;     // +1% per guarantee month
const EXCLUSIVE_DISCOUNT = 0.10; // 10% off for Exclusive
const RECRUITER_PCT = 0.07;     // 7% of annual salary (default, manually adjusted by Recruito)
const TRADITIONAL_FEE_PCT = 25; // for savings comparison

const GUARANTEE_OPTIONS = [0, 1, 2] as const;

interface CalcResults {
    commission: number;
    exclusiveDiscount: number;
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
): CalcResults {
    const commission = BASE_COMMISSION + guaranteeMonths * GUARANTEE_ADJ;
    const exclusiveDiscount = isExclusive ? EXCLUSIVE_DISCOUNT : 0;

    const rawFee = annualSalary * commission * (1 - exclusiveDiscount);
    const minFeeApplied = rawFee < MIN_FEE;
    const clientFee = Math.max(rawFee, MIN_FEE);
    const recruiterFee = annualSalary * RECRUITER_PCT;
    const recruitorRevenue = clientFee - recruiterFee;
    const totalClientFee = clientFee * hires;
    const traditionalFee = annualSalary * (TRADITIONAL_FEE_PCT / 100) * hires;
    const savings = traditionalFee - totalClientFee;
    const savingsPercent = traditionalFee > 0 ? (savings / traditionalFee) * 100 : 0;

    return {
        commission,
        exclusiveDiscount,
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
}

export const CALCULATOR_DEFAULTS: CalculatorState = {
    salary: 44_000,
    guaranteeMonths: 0,
    isExclusive: false,
    hires: 1,
};

interface RecruitmentCalculatorProps {
    state?: CalculatorState;
    onStateChange?: (state: CalculatorState) => void;
}

export function RecruitmentCalculator({ state, onStateChange }: RecruitmentCalculatorProps) {
    const [localSalary, setLocalSalary] = useState(CALCULATOR_DEFAULTS.salary);
    const [localGuaranteeMonths, setLocalGuaranteeMonths] = useState<0 | 1 | 2>(CALCULATOR_DEFAULTS.guaranteeMonths);
    const [localIsExclusive, setLocalIsExclusive] = useState(CALCULATOR_DEFAULTS.isExclusive);
    const [localHires, setLocalHires] = useState(CALCULATOR_DEFAULTS.hires);

    // Use controlled state if provided, otherwise local state
    const salary = state?.salary ?? localSalary;
    const guaranteeMonths = state?.guaranteeMonths ?? localGuaranteeMonths;
    const isExclusive = state?.isExclusive ?? localIsExclusive;
    const hires = state?.hires ?? localHires;

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

    const r = useMemo(
        () => calculate(salary, guaranteeMonths, isExclusive, hires),
        [salary, guaranteeMonths, isExclusive, hires],
    );

    return (
        <div className="mx-0 mt-1 mb-1">
            <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 shadow-lg shadow-brand-500/5 overflow-hidden">
                {/* ── Inputs ── */}
                <div className="p-3.5 space-y-3">
                    {/* Annual salary */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-baseline">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Årslön
                            </label>
                            <span className="text-xs font-bold text-slate-700 tabular-nums">
                                €{fmt(salary)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={20_000}
                            max={200_000}
                            step={1_000}
                            value={salary}
                            onChange={(e) => setSalary(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200 accent-brand-600"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400">
                            <span>€20 000</span>
                            <span>€200 000</span>
                        </div>
                    </div>

                    {/* Guarantee months */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Garanti
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
                                    {months === 0 ? "Ingen" : `${months} mån`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Job type */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Uppdragstyp
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
                                10% rabatt på slutavgiften för Exclusive-uppdrag
                            </p>
                        )}
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
                                <span className="font-semibold">11%</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <span>Garanti ({guaranteeMonths} mån)</span>
                                <span className="font-semibold">+{guaranteeMonths}%</span>
                            </div>
                            {isExclusive && (
                                <div className="flex justify-between text-brand-500">
                                    <span>Exclusive-rabatt</span>
                                    <span className="font-semibold">−10%</span>
                                </div>
                            )}
                            <div className="h-px bg-slate-200 my-1" />
                            <div className="flex justify-between font-bold text-slate-700 text-[11px]">
                                <span>Provision</span>
                                <span>{fmt(r.commission * 100, 0)}%{isExclusive ? " × 0.9" : ""}</span>
                            </div>
                        </div>
                    </div>

                    {/* Client fee */}
                    <div className="rounded-lg bg-brand-50 border border-brand-100 p-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-brand-500 mb-0.5">
                            Rekryteringsavgift (kund){hires > 1 ? " — per st" : ""}
                        </div>
                        <div className="text-lg font-black text-brand-700 leading-tight tabular-nums">
                            €{fmt(r.clientFee)} <span className="text-xs font-bold">EUR</span>
                        </div>
                        {r.minFeeApplied && (
                            <div className="text-[9px] text-brand-500 mt-0.5">
                                Minimiavgift €3 500 tillämpas
                            </div>
                        )}
                    </div>

                    {/* Internal breakdown */}
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 space-y-0.5 text-[10px] tabular-nums">
                        <div className="flex justify-between text-slate-500">
                            <span>Rekryterararvode (7% av lön)</span>
                            <span className="font-semibold">€{fmt(r.recruiterFee)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-700">
                            <span>Recruito intäkt</span>
                            <span>€{fmt(r.recruitorRevenue)}</span>
                        </div>
                    </div>

                    {/* Total for multiple hires */}
                    {hires > 1 && (
                        <div className="flex justify-between items-baseline px-1">
                            <span className="text-[10px] font-semibold text-slate-500">
                                Total kund ({hires} st)
                            </span>
                            <span className="text-sm font-bold text-slate-700 tabular-nums">
                                €{fmt(r.totalClientFee)}
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
                                €{fmt(r.savings)}
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
                                    width: `${(r.totalClientFee / Math.max(r.traditionalFee, 1)) * 100}%`,
                                }}
                            />
                            <div className="flex-1 bg-slate-200 rounded-full" />
                        </div>
                        <div className="flex justify-between text-[9px] tabular-nums text-slate-500">
                            <span>€{fmt(r.totalClientFee)}</span>
                            <span>€{fmt(r.traditionalFee)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
