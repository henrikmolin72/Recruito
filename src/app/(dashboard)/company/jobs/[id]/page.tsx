"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Play,
  Pause,
  XCircle,
  Users,
  MapPin,
  Building2,
  Briefcase,
  Clock,
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  nice_to_have: string | null;
  industry: string;
  location: string;
  employment_type: string;
  remote_policy: string | null;
  salary_min: number | null;
  salary_max: number | null;
  fee_percentage: number;
  max_recruiters: number;
  current_recruiter_count: number;
  status: string;
  created_at: string;
  published_at: string | null;
}

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  current_title: string | null;
  status: string;
  submitted_at: string;
  recruiter_id: string;
}

const statusLabels: Record<string, string> = {
  draft: "Utkast",
  active: "Aktiv",
  paused: "Pausad",
  filled: "Tillsatt",
  closed: "Stängd",
  cancelled: "Avbruten",
};

const candidateStatusLabels: Record<string, string> = {
  submitted: "Inskickad",
  reviewing: "Granskas",
  interview: "Intervju",
  offered: "Erbjudande",
  hired: "Anställd",
  guarantee_period: "Garantiperiod",
  completed: "Klar",
  rejected: "Avvisad",
  declined: "Nekad",
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchJob() {
      const { data: jobData } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", params.id)
        .single();

      if (jobData) {
        setJob(jobData);

        const { data: candidateData } = await supabase
          .from("candidates")
          .select("id, first_name, last_name, current_title, status, submitted_at, recruiter_id")
          .eq("job_id", params.id)
          .order("submitted_at", { ascending: false });

        if (candidateData) setCandidates(candidateData);
      }
      setLoading(false);
    }

    fetchJob();
  }, [params.id]);

  async function updateJobStatus(newStatus: string) {
    if (!job) return;
    setActionLoading(true);

    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "active" && !job.published_at) {
      updates.published_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("jobs")
      .update(updates)
      .eq("id", job.id);

    if (error) {
      toast.error("Kunde inte uppdatera status", { description: error.message });
    } else {
      setJob({ ...job, ...updates } as Job);
      const label = statusLabels[newStatus] || newStatus;
      toast.success(`Jobbet är nu ${label.toLowerCase()}`);
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-lg font-semibold">Jobbet hittades inte</h2>
        <Link href="/company/jobs" className="mt-2 text-sm text-brand-600 hover:underline">
          Tillbaka till jobb
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            href="/company/jobs"
            className="mt-1 rounded-md p-2 text-muted-foreground hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{job.title}</h1>
              <Badge
                variant={
                  job.status === "active"
                    ? "default"
                    : job.status === "draft"
                      ? "outline"
                      : "secondary"
                }
              >
                {statusLabels[job.status]}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {job.industry}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {job.employment_type}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatRelativeDate(job.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {job.status === "draft" && (
            <button
              onClick={() => updateJobStatus("active")}
              disabled={actionLoading}
              className="inline-flex h-9 items-center gap-1 rounded-md bg-success-500 px-4 text-sm font-medium text-white hover:bg-success-700 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              Publicera
            </button>
          )}
          {job.status === "active" && (
            <button
              onClick={() => updateJobStatus("paused")}
              disabled={actionLoading}
              className="inline-flex h-9 items-center gap-1 rounded-md border px-4 text-sm font-medium text-muted-foreground hover:bg-gray-100 disabled:opacity-50"
            >
              <Pause className="h-3.5 w-3.5" />
              Pausa
            </button>
          )}
          {job.status === "paused" && (
            <button
              onClick={() => updateJobStatus("active")}
              disabled={actionLoading}
              className="inline-flex h-9 items-center gap-1 rounded-md bg-success-500 px-4 text-sm font-medium text-white hover:bg-success-700 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              Återuppta
            </button>
          )}
          {(job.status === "active" || job.status === "paused") && (
            <button
              onClick={() => updateJobStatus("closed")}
              disabled={actionLoading}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-danger-500 px-4 text-sm font-medium text-danger-500 hover:bg-danger-50 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Stäng
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Rekryterare</p>
          <p className="mt-1 text-2xl font-bold">
            {job.current_recruiter_count}/{job.max_recruiters}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Kandidater</p>
          <p className="mt-1 text-2xl font-bold">{candidates.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Avgift</p>
          <p className="mt-1 text-2xl font-bold">{job.fee_percentage}%</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Lönespann</p>
          <p className="mt-1 text-lg font-bold">
            {job.salary_min && job.salary_max
              ? `${formatCurrency(job.salary_min)} – ${formatCurrency(job.salary_max)}`
              : job.salary_min
                ? formatCurrency(job.salary_min)
                : job.salary_max
                  ? formatCurrency(job.salary_max)
                  : "Ej angett"}
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-3 text-lg font-semibold">Beskrivning</h2>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {job.description}
        </p>

        {job.requirements && (
          <>
            <h3 className="mb-2 mt-6 font-semibold">Kravprofil</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {job.requirements}
            </p>
          </>
        )}

        {job.nice_to_have && (
          <>
            <h3 className="mb-2 mt-6 font-semibold">Meriterande</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {job.nice_to_have}
            </p>
          </>
        )}

        {job.remote_policy && (
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Distanspolicy:</span>{" "}
            {job.remote_policy}
          </p>
        )}
      </div>

      {/* Candidates */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Kandidater ({candidates.length})
        </h2>

        {candidates.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Inga kandidater har presenterats ännu.
              {job.status === "draft" && " Publicera jobbet för att börja ta emot kandidater."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map((c) => (
              <Link
                key={c.id}
                href={`/company/candidates/${c.id}`}
                className="flex items-center justify-between rounded-md border p-4 transition-colors hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium">
                    {c.first_name} {c.last_name}
                  </p>
                  {c.current_title && (
                    <p className="text-sm text-muted-foreground">
                      {c.current_title}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant="secondary">
                    {candidateStatusLabels[c.status] || c.status}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatRelativeDate(c.submitted_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
