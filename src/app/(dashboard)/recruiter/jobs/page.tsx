"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Building2, Briefcase, Users, Loader2, Check } from "lucide-react";

interface JobWithCompany {
  id: string;
  title: string;
  description: string;
  industry: string;
  location: string;
  employment_type: string;
  remote_policy: string | null;
  salary_min: number | null;
  salary_max: number | null;
  fee_percentage: number;
  max_recruiters: number;
  current_recruiter_count: number;
  company_id: string;
  companies: { company_name: string; city: string } | null;
  _has_mandate?: boolean;
}

export default function RecruiterBrowseJobsPage() {
  const { user } = useUser();
  const [jobs, setJobs] = useState<JobWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function fetchJobs() {
      const { data } = await supabase
        .from("jobs")
        .select("*, companies(company_name, city)")
        .eq("status", "active")
        .order("published_at", { ascending: false });

      if (data && user?.recruiter_id) {
        const { data: mandates } = await supabase
          .from("job_mandates")
          .select("job_id")
          .eq("recruiter_id", user.recruiter_id)
          .eq("is_active", true);

        const mandateJobIds = new Set(mandates?.map((m) => m.job_id) || []);
        const enriched = data.map((job) => ({
          ...job,
          _has_mandate: mandateJobIds.has(job.id),
        }));
        setJobs(enriched);
      } else if (data) {
        setJobs(data);
      }

      setLoading(false);
    }

    fetchJobs();
  }, [user?.recruiter_id]);

  async function claimMandate(jobId: string) {
    if (!user?.recruiter_id) return;
    setClaimingId(jobId);

    const { error } = await supabase.from("job_mandates").insert({
      job_id: jobId,
      recruiter_id: user.recruiter_id,
    });

    if (error) {
      toast.error("Kunde inte ta uppdraget", { description: error.message });
    } else {
      toast.success("Du har tagit uppdraget!");
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, _has_mandate: true, current_recruiter_count: j.current_recruiter_count + 1 }
            : j
        )
      );
    }
    setClaimingId(null);
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !searchTerm ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.companies?.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = !filterIndustry || job.industry === filterIndustry;
    return matchesSearch && matchesIndustry;
  });

  const industries = [...new Set(jobs.map((j) => j.industry))].sort();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bläddra jobb</h1>
        <p className="text-muted-foreground">
          Hitta uppdrag som matchar din expertis
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Sök jobb eller företag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
        <select
          value={filterIndustry}
          onChange={(e) => setFilterIndustry(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">Alla branscher</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
      </div>

      {/* Job list */}
      {filteredJobs.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">
            {jobs.length === 0
              ? "Inga aktiva jobb just nu"
              : "Inga jobb matchar din sökning"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Försök med andra sökord eller filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="rounded-lg border bg-card p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold">{job.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {job.companies?.company_name}
                    {job.companies?.city && ` · ${job.companies.city}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{job.industry}</Badge>
                    <Badge variant="secondary">{job.location}</Badge>
                    <Badge variant="secondary">{job.employment_type}</Badge>
                    {job.remote_policy && (
                      <Badge variant="outline">{job.remote_policy}</Badge>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {job.description}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-success-500">
                    {job.fee_percentage}%
                  </p>
                  <p className="text-xs text-muted-foreground">avgift</p>
                  {(job.salary_min || job.salary_max) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {job.salary_min && job.salary_max
                        ? `${formatCurrency(job.salary_min)} – ${formatCurrency(job.salary_max)}`
                        : job.salary_min
                          ? `Från ${formatCurrency(job.salary_min)}`
                          : `Upp till ${formatCurrency(job.salary_max!)}`}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {job.current_recruiter_count}/{job.max_recruiters}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {job.industry}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.location}
                  </span>
                </div>

                {job._has_mandate ? (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-success-500">
                    <Check className="h-4 w-4" />
                    Du har detta mandat
                  </span>
                ) : job.current_recruiter_count >= job.max_recruiters ? (
                  <span className="text-sm text-muted-foreground">
                    Fullbokat
                  </span>
                ) : (
                  <button
                    onClick={() => claimMandate(job.id)}
                    disabled={claimingId === job.id}
                    className="inline-flex h-9 items-center gap-1 rounded-md bg-success-500 px-4 text-sm font-medium text-white hover:bg-success-700 disabled:opacity-50"
                  >
                    {claimingId === job.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Briefcase className="h-3.5 w-3.5" />
                    )}
                    Ta uppdraget
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
