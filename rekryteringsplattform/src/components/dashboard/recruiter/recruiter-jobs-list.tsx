"use client";

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
  Filter,
  TrendingUp,
  Clock,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TakeMandateButton } from "@/components/dashboard/recruiter/take-mandate-button";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";

interface RecruiterJobsListProps {
  jobs: any[];
}

export function RecruiterJobsList({ jobs }: RecruiterJobsListProps) {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [location, setLocation] = useState("all");
  const { t } = useTranslations();

  // Extract unique industries and locations from actual data
  const industries = useMemo(() => {
    const set = new Set(jobs.map((j: any) => j.industry).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  const locations = useMemo(() => {
    const set = new Set(jobs.map((j: any) => j.location).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job: any) => {
      const searchStr = `${job.title} ${job.company_name} ${job.industry} ${job.location} ${job.description || ""}`.toLowerCase();
      const matchesSearch = !search || searchStr.includes(search.toLowerCase());
      const matchesIndustry = industry === "all" || job.industry === industry;
      const matchesLocation = location === "all" || job.location === location;
      return matchesSearch && matchesIndustry && matchesLocation;
    });
  }, [jobs, search, industry, location]);

  const hasActiveFilters = search || industry !== "all" || location !== "all";

  const clearFilters = () => {
    setSearch("");
    setIndustry("all");
    setLocation("all");
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
            {t("recruiter.jobCountLabel").replace("{filtered}", String(filteredJobs.length)).replace("{total}", String(jobs.length))}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="group bg-white p-2 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row gap-2 transition-all focus-within:ring-2 focus-within:ring-brand-500/20">
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
        <div className="flex items-center px-4 gap-4 flex-wrap pb-2 md:pb-0">
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="h-10 rounded-xl border-none bg-slate-50 px-4 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-brand-500/20 outline-none cursor-pointer"
          >
            <option value="all">{t("recruiter.allIndustries")}</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="h-10 rounded-xl border-none bg-slate-50 px-4 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-brand-500/20 outline-none cursor-pointer"
          >
            <option value="all">{t("recruiter.allLocations")}</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-xl h-10 border border-slate-100 bg-white gap-2">
              <X className="h-3.5 w-3.5" /> {t("common.clear")}
            </Button>
          )}
        </div>
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
            const potentialCommission = (job.salary_max || job.salary_min)
              ? (job.salary_max || job.salary_min) * (job.fee_percentage / 100)
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
                          {job.employment_type || t("employment.fullTime")}
                        </Badge>
                      </div>

                      <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-brand-600 transition-colors">
                        {job.title}
                      </h3>

                      <div className="flex items-center flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 opacity-40" /> {job.company_name}
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
                              {t("recruiter.slotsFilled").replace("{count}", String(job.recruiters_count)).replace("{max}", String(job.max_recruiters))}
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
                          <p className="text-[9px] text-slate-400 font-medium mt-1">{t("recruiter.basedOnFee").replace("{fee}", String(job.fee_percentage))}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs px-2">
                          <span className="text-slate-400 font-bold uppercase tracking-wider">{t("recruiter.salaryIndication")}</span>
                          <span className="text-slate-600 font-black">{job.salary_min ? formatCurrency(job.salary_min) : t("common.notSpecifiedNeutral")}</span>
                        </div>
                      </div>

                      <div className="mt-8">
                        <TakeMandateButton jobId={job.id} />
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
