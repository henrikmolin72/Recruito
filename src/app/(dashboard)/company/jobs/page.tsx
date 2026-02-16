"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, Users, Loader2 } from "lucide-react";

interface Job {
  id: string;
  title: string;
  industry: string;
  location: string;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  fee_percentage: number;
  max_recruiters: number;
  current_recruiter_count: number;
  status: string;
  created_at: string;
  published_at: string | null;
  _candidate_count?: number;
}

const statusLabels: Record<string, string> = {
  draft: "Utkast",
  active: "Aktiv",
  paused: "Pausad",
  filled: "Tillsatt",
  closed: "Stängd",
  cancelled: "Avbruten",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  active: "default",
  paused: "secondary",
  filled: "default",
  closed: "secondary",
  cancelled: "destructive",
};

export default function CompanyJobsPage() {
  const { user } = useUser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user?.company_id) return;

    async function fetchJobs() {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("company_id", user!.company_id!)
        .order("created_at", { ascending: false });

      if (data) {
        const jobsWithCounts = await Promise.all(
          data.map(async (job) => {
            const { count } = await supabase
              .from("candidates")
              .select("*", { count: "exact", head: true })
              .eq("job_id", job.id);
            return { ...job, _candidate_count: count || 0 };
          })
        );
        setJobs(jobsWithCounts);
      }
      setLoading(false);
    }

    fetchJobs();
  }, [user?.company_id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mina jobb</h1>
          <p className="text-muted-foreground">
            Hantera dina jobbannonser
          </p>
        </div>
        <Link
          href="/company/jobs/new"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Skapa jobb
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">Inga jobb ännu</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Skapa din första jobbannons för att börja ta emot kandidater.
          </p>
          <Link
            href="/company/jobs/new"
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700"
          >
            Skapa jobb
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/company/jobs/${job.id}`}
              className="block rounded-lg border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="truncate text-lg font-semibold">
                      {job.title}
                    </h3>
                    <Badge variant={statusVariants[job.status]}>
                      {statusLabels[job.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {job.industry} · {job.location} · {job.employment_type}
                  </p>
                  {(job.salary_min || job.salary_max) && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {job.salary_min && job.salary_max
                        ? `${formatCurrency(job.salary_min)} – ${formatCurrency(job.salary_max)}`
                        : job.salary_min
                          ? `Från ${formatCurrency(job.salary_min)}`
                          : `Upp till ${formatCurrency(job.salary_max!)}`}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-6 text-right">
                  <div>
                    <p className="text-sm font-medium">{job.current_recruiter_count}/{job.max_recruiters}</p>
                    <p className="text-xs text-muted-foreground">Rekryterare</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{job._candidate_count}</p>
                    <p className="text-xs text-muted-foreground">Kandidater</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{job.fee_percentage}%</p>
                    <p className="text-xs text-muted-foreground">Avgift</p>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Skapad {formatRelativeDate(job.created_at)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
