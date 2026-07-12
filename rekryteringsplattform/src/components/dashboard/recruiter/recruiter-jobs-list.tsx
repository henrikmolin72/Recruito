"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Building2,
  Users,
  Search,
  TrendingUp,
  Clock,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { formatCurrency, formatDate, floorToHundreds } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import { EMPLOYMENT_TYPE_DICT_KEY } from "@/lib/job-form-options";
import { BonusBadge } from "@/components/shared/bonus-badge";

// Job statuses where the company has ended the job (vs. a temporary pause).
const ENDED_STATUSES = new Set(["closed", "filled", "cancelled"]);

const SALARY_RANGES = [
  { label: "Any", value: "all", min: 0, max: Infinity },
  { label: "< €30 000", value: "0-30000", min: 0, max: 30000 },
  { label: "€30 000 – €50 000", value: "30000-50000", min: 30000, max: 50000 },
  { label: "€50 000 – €80 000", value: "50000-80000", min: 50000, max: 80000 },
  { label: "€80 000 – €120 000", value: "80000-120000", min: 80000, max: 120000 },
  { label: "> €120 000", value: "120000+", min: 120000, max: Infinity },
] as const;

type SortOption = "newest" | "oldest" | "salary_high" | "salary_low" | "fee_high";

interface RecruiterJobsListProps {
  jobs: any[];
}

export function RecruiterJobsList({ jobs }: RecruiterJobsListProps) {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [location, setLocation] = useState("all");
  const [employmentType, setEmploymentType] = useState("all");
  const [workType, setWorkType] = useState("all");
  const [salaryRange, setSalaryRange] = useState("all");
  const [country, setCountry] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const { t } = useTranslations();

  const selectClass = "h-10 rounded-xl border-none bg-slate-50 px-4 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-brand-500/20 outline-none cursor-pointer";

  // Extract unique values from actual data
  const industries = useMemo(() => {
    const set = new Set(jobs.map((j: any) => j.industry).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  const locations = useMemo(() => {
    const set = new Set(jobs.map((j: any) => j.location).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  const countries = useMemo(() => {
    const set = new Set(jobs.map((j: any) => j.country).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  const employmentTypes = useMemo(() => {
    const set = new Set(jobs.map((j: any) => j.employment_type).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  const workTypes = useMemo(() => {
    const set = new Set(jobs.map((j: any) => j.work_type).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const filtered = jobs.filter((job: any) => {
      const searchStr = `${job.title} ${job.company_name || ""} ${job.industry} ${job.location} ${job.description || ""}`.toLowerCase();
      const matchesSearch = !search || searchStr.includes(search.toLowerCase());
      const matchesIndustry = industry === "all" || job.industry === industry;
      const matchesLocation = location === "all" || job.location === location;
      const matchesEmployment = employmentType === "all" || job.employment_type === employmentType;
      const matchesWorkType = workType === "all" || job.work_type === workType;
      const matchesCountry = country === "all" || job.country === country;

      let matchesSalary = true;
      if (salaryRange !== "all") {
        const range = SALARY_RANGES.find((r) => r.value === salaryRange);
        if (range) {
          const salary = job.salary_max || job.salary_min || 0;
          matchesSalary = salary >= range.min && salary < range.max;
        }
      }

      return matchesSearch && matchesIndustry && matchesLocation && matchesEmployment && matchesWorkType && matchesSalary && matchesCountry;
    });

    // Sort
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "salary_high":
          return (b.salary_max || b.salary_min || 0) - (a.salary_max || a.salary_min || 0);
        case "salary_low":
          return (a.salary_min || a.salary_max || 0) - (b.salary_min || b.salary_max || 0);
        case "fee_high": {
          const feeA = a.recruiter_fee_amount != null
            ? Number(a.recruiter_fee_amount)
            : (a.salary_max || a.salary_min || 0) * ((a.recruiter_fee_percentage ?? 7) / 100);
          const feeB = b.recruiter_fee_amount != null
            ? Number(b.recruiter_fee_amount)
            : (b.salary_max || b.salary_min || 0) * ((b.recruiter_fee_percentage ?? 7) / 100);
          return feeB - feeA;
        }
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [jobs, search, industry, location, employmentType, workType, salaryRange, country, sortBy]);

  const hasActiveFilters = search || industry !== "all" || location !== "all" || employmentType !== "all" || workType !== "all" || salaryRange !== "all" || country !== "all";
  const activeFilterCount = [industry !== "all", location !== "all", employmentType !== "all", workType !== "all", salaryRange !== "all", country !== "all"].filter(Boolean).length;

  // The header counter reflects only LIVE (active, claimable) assignments. The
  // marketplace also lists paused jobs, but those are not live opportunities.
  const liveTotal = jobs.filter((j: any) => j.status === "active").length;
  const liveFiltered = filteredJobs.filter((j: any) => j.status === "active").length;

  const clearFilters = () => {
    setSearch("");
    setIndustry("all");
    setLocation("all");
    setEmploymentType("all");
    setWorkType("all");
    setSalaryRange("all");
    setCountry("all");
    setSortBy("newest");
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Header section */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b pb-8 border-slate-100">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{t("recruiter.jobsPageTitle")}</h1>
          <p className="text-slate-500 font-medium">{t("recruiter.jobsPageSubtitle")}</p>
        </div>
        <div className="flex items-center gap-3 bg-brand-50 px-4 py-2 rounded-2xl border border-brand-100">
          <TrendingUp className="h-4 w-4 text-brand-600" />
          <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
            {t("recruiter.jobCountLabel").replace("{filtered}", String(liveFiltered)).replace("{total}", String(liveTotal))}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-brand-500/20">
        {/* Search + primary filters row */}
        <div className="p-2 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1 group/search">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/search:text-brand-500 transition-colors" />
            <Input
              placeholder={t("recruiter.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-14 pl-14 border-none bg-transparent focus-visible:ring-0 text-slate-700 font-medium placeholder:text-slate-400"
            />
          </div>
          <div className="h-14 w-[1px] bg-slate-100 hidden md:block" />
          <div className="flex items-center px-4 gap-3 flex-wrap pb-2 md:pb-0">
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectClass}>
              <option value="all">{t("recruiter.allIndustries")}</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
            <select value={location} onChange={(e) => setLocation(e.target.value)} className={selectClass}>
              <option value="all">{t("recruiter.allLocations")}</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className={selectClass}>
              <option value="all">{t("recruiter.allEmploymentTypes") || "All types"}</option>
              {employmentTypes.map((et) => (
                <option key={et} value={et}>
                  {t(`employment.${EMPLOYMENT_TYPE_DICT_KEY[et] || "fullTime"}`)}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className={cn(
                "h-10 rounded-xl px-4 text-xs font-bold flex items-center gap-2 transition-all",
                showMoreFilters || activeFilterCount > 0
                  ? "bg-brand-50 text-brand-600 border border-brand-100"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t("recruiter.moreFilters") || "More filters"}
              {activeFilterCount > 0 && (
                <span className="h-5 w-5 rounded-full bg-brand-600 text-white text-[10px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-xl h-10 border border-slate-100 bg-white gap-2">
                <X className="h-3.5 w-3.5" /> {t("common.clear")}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded filters row */}
        {showMoreFilters && (
          <div className="px-6 pb-4 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <select value={workType} onChange={(e) => setWorkType(e.target.value)} className={selectClass}>
              <option value="all">{t("recruiter.allWorkTypes") || "All work types"}</option>
              {workTypes.map((wt) => (
                <option key={wt} value={wt}>
                  {wt === "onsite" ? (t("recruiter.workOnsite") || "On-site") : wt === "hybrid" ? (t("recruiter.workHybrid") || "Hybrid") : wt === "remote" ? (t("recruiter.workRemote") || "Remote") : wt}
                </option>
              ))}
            </select>
            <select value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} className={selectClass}>
              <option value="all">{t("recruiter.allSalaries") || "All salaries"}</option>
              {SALARY_RANGES.slice(1).map((range) => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
            {countries.length > 1 && (
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
                <option value="all">{t("recruiter.allCountries") || "All countries"}</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            <div className="h-6 w-[1px] bg-slate-200 hidden md:block" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className={cn(selectClass, "bg-white border border-slate-200")}>
              <option value="newest">{t("recruiter.sortNewest") || "Newest first"}</option>
              <option value="oldest">{t("recruiter.sortOldest") || "Oldest first"}</option>
              <option value="salary_high">{t("recruiter.sortSalaryHigh") || "Highest salary"}</option>
              <option value="salary_low">{t("recruiter.sortSalaryLow") || "Lowest salary"}</option>
              <option value="fee_high">{t("recruiter.sortFeeHigh") || "Highest fee"}</option>
            </select>
          </div>
        )}
      </div>

      {/* Jobs Grid */}
      <div className="grid gap-6">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-20 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Search className="h-8 w-8 text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t("recruiter.noResultsTitle")}</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2 font-medium">
              {hasActiveFilters
                ? t("recruiter.noResultsWithFilters")
                : t("recruiter.noResultsNoFilters")}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                {t("common.clearFilters")}
              </Button>
            )}
          </div>
        ) : (
          filteredJobs.map((job: any) => {
            const recruiterFeePct = job.recruiter_fee_percentage ?? 7;
            // Fallback estimate uses the same rounding as the locked fee
            // (calculateRecruiterFee floors to hundreds) so the card never
            // shows more than what would actually be locked on the row.
            const potentialCommission = job.recruiter_fee_amount != null
              ? Number(job.recruiter_fee_amount)
              : (job.salary_max || job.salary_min)
                ? floorToHundreds((job.salary_max || job.salary_min) * (recruiterFeePct / 100))
                : null;

            return (
              <Card key={job.id} className="group relative border-none shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300 rounded-[2rem] overflow-hidden bg-white">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    {/* Left: Info */}
                    <div className="flex-1 p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <Badge variant="outline" className="rounded-full bg-slate-50 text-slate-500 border-slate-100 py-1 px-3">
                          {job.industry}
                        </Badge>
                        <Badge variant="outline" className="rounded-full bg-blue-50 text-blue-600 border-blue-100 py-1 px-3">
                          {t(`employment.${EMPLOYMENT_TYPE_DICT_KEY[job.employment_type] || "fullTime"}`)}
                        </Badge>
                        {job.status !== "active" && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full py-1 px-3",
                              ENDED_STATUSES.has(job.status)
                                ? "bg-rose-50 text-rose-600 border-rose-100"
                                : "bg-slate-50 text-slate-500 border-slate-100",
                            )}
                          >
                            {t(`status.${job.status}`) || job.status}
                          </Badge>
                        )}
                        {job.worked_previously && (
                          <Badge variant="outline" className="rounded-full bg-amber-50 text-amber-700 border-amber-200 py-1 px-3">
                            {t("recruiter.workedPreviously") || "Worked Previously"}
                          </Badge>
                        )}
                        {job.final_interview_bonus && (
                          <BonusBadge label={t("recruiter.finalInterviewBonus") || "€100 Final Interview Bonus"} className="rounded-full" />
                        )}
                      </div>

                      <Link href={`/recruiter/jobs/${job.id}`}>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-brand-600 transition-colors cursor-pointer">
                          {job.title}
                        </h3>
                      </Link>

                      <div className="flex items-center flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 opacity-40" /> {job.company_name ?? t("recruiter.confidentialCompany")}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 opacity-40" /> {job.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 opacity-40" /> {t("recruiter.publishedDate").replace("{date}", formatDate(job.created_at))}
                        </div>
                      </div>

                      <div className="mt-8 flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="text-[11px] leading-tight capitalize">
                            <p className="text-slate-400 font-bold uppercase tracking-widest">{t("recruiter.slotsLabel")}</p>
                            <p className={cn("font-black", job.recruiters_count >= job.max_recruiters ? "text-danger-500" : "text-slate-700")}>
                              {job.recruiters_count >= job.max_recruiters
                                ? t("recruiter.slotsFull")
                                : t("recruiter.slotsTaken").replace("{count}", String(job.recruiters_count))}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="text-[11px] leading-tight capitalize">
                            <p className="text-slate-400 font-bold uppercase tracking-widest">{t("recruiter.pendingLabel") || "Pending"}</p>
                            <p className="font-black text-slate-700">
                              {t("recruiter.pendingCount").replace("{count}", String(job.pending_candidates_count ?? 0))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Financials & Action */}
                    <div className="lg:w-80 bg-slate-50/50 p-8 border-l border-slate-100 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t("recruiter.estimatedFee")}</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-brand-600">
                              {potentialCommission != null ? formatCurrency(potentialCommission) : t("common.notSpecifiedNeutral")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs px-2">
                          <span className="text-slate-400 font-bold uppercase tracking-wider">{t("recruiter.salaryIndication")}</span>
                          <span className="text-slate-600 font-black">{(job.salary_max || job.salary_min) ? formatCurrency(job.salary_max || job.salary_min) : t("common.notSpecifiedNeutral")}</span>
                        </div>
                        {job.guarantee_period_months != null && (
                          <div className="flex items-center justify-between text-xs px-2">
                            <span className="text-slate-400 font-bold uppercase tracking-wider">{t("recruiter.guaranteeLabel")}</span>
                            <span className="text-brand-600 font-black">
                              {t(job.guarantee_period_months === 1 ? "company.guaranteeMonths" : "company.guaranteeMonthsPlural").replace("{count}", String(job.guarantee_period_months))}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-8">
                        <Link href={`/recruiter/jobs/${job.id}`}>
                          <Button size="sm" className="w-full">
                            {t("recruiter.viewDetails") || "View details"}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
