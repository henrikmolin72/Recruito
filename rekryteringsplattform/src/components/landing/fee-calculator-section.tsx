"use client";

import { useState } from "react";
import { Calculator, TrendingDown, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function FeeCalculatorSection() {
  const [salary, setSalary] = useState<number>(600000);

  const traditionalPercentage = 25;
  const rekrytoPercentage = 15;

  const traditionalFee = salary * (traditionalPercentage / 100);
  const rekrytoFee = salary * (rekrytoPercentage / 100);
  const savings = traditionalFee - rekrytoFee;
  const recruiterEarnings = rekrytoFee * 0.75; // 75% goes to recruiter

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSalary(Number(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const num = Number(value);
    if (num >= 0 && num <= 2000000) {
      setSalary(num);
    }
  };

  return (
    <section className="bg-gradient-to-b from-white to-brand-50/30 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-600">
            <Calculator className="size-4" />
            Rakna ut din besparing
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#1B4F72] sm:text-4xl">
            Se hur mycket du sparar
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Jamfor kostnaden med en traditionell rekryteringsbyr&aring; mot Rekryto
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl rounded-2xl border bg-white p-6 shadow-lg sm:p-8">
          {/* Salary input */}
          <div className="mb-8">
            <label
              htmlFor="salary-input"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Arslon (SEK)
            </label>
            <div className="flex items-center gap-4">
              <input
                id="salary-input"
                type="text"
                value={salary.toLocaleString("sv-SE")}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-lg font-semibold text-foreground shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <input
              type="range"
              min={200000}
              max={2000000}
              step={10000}
              value={salary}
              onChange={handleSliderChange}
              className="mt-4 w-full accent-brand-600"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>200 000 kr</span>
              <span>2 000 000 kr</span>
            </div>
          </div>

          {/* Comparison */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Traditional */}
            <div className="rounded-xl border border-muted bg-muted/30 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Traditionell byrå (25%)
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {formatCurrency(traditionalFee)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Rekryteringskostnad
              </p>
            </div>

            {/* Rekryto */}
            <div className="rounded-xl border-2 border-success-500 bg-success-50/50 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-success-700">
                Rekryto (15%)
              </p>
              <p className="mt-2 text-2xl font-bold text-success-700">
                {formatCurrency(rekrytoFee)}
              </p>
              <p className="mt-1 text-sm text-success-700/70">
                Rekryteringskostnad
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100">
                <TrendingDown className="size-5 text-brand-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-brand-600">
                  Foretaget sparar
                </p>
                <p className="text-xl font-bold text-brand-700">
                  {formatCurrency(savings)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-success-50 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-500/20">
                <ArrowRight className="size-5 text-success-700" />
              </div>
              <div>
                <p className="text-xs font-medium text-success-700">
                  Rekryteraren tjanar
                </p>
                <p className="text-xl font-bold text-success-700">
                  {formatCurrency(recruiterEarnings)}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Beraknat p&aring; {rekrytoPercentage}% avgift av &aring;rslon. Rekryteraren
            erh&aring;ller 75% av avgiften.
          </p>
        </div>
      </div>
    </section>
  );
}
