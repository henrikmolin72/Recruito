"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { formatRelativeDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2 } from "lucide-react";

interface CandidateWithJob {
  id: string;
  first_name: string;
  last_name: string;
  current_title: string | null;
  current_company: string | null;
  status: string;
  submitted_at: string;
  jobs: { id: string; title: string } | null;
}

const statusLabels: Record<string, string> = {
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

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  submitted: "outline",
  reviewing: "secondary",
  interview: "default",
  offered: "default",
  hired: "default",
  guarantee_period: "secondary",
  completed: "default",
  rejected: "destructive",
  declined: "destructive",
};

export default function CompanyCandidatesPage() {
  const { user } = useUser();
  const [candidates, setCandidates] = useState<CandidateWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (!user?.company_id) return;

    async function fetchCandidates() {
      // Get company's jobs first, then their candidates
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id")
        .eq("company_id", user!.company_id!);

      if (!jobs || jobs.length === 0) {
        setLoading(false);
        return;
      }

      const jobIds = jobs.map((j) => j.id);
      const { data } = await supabase
        .from("candidates")
        .select("id, first_name, last_name, current_title, current_company, status, submitted_at, jobs(id, title)")
        .in("job_id", jobIds)
        .order("submitted_at", { ascending: false });

      if (data) setCandidates(data as unknown as CandidateWithJob[]);
      setLoading(false);
    }

    fetchCandidates();
  }, [user?.company_id]);

  const filteredCandidates = filterStatus
    ? candidates.filter((c) => c.status === filterStatus)
    : candidates;

  const statusCounts = candidates.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

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
        <h1 className="text-2xl font-bold">Kandidater</h1>
        <p className="text-muted-foreground">
          Alla kandidater presenterade till dina jobb
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">Inga kandidater ännu</h2>
          <p className="text-sm text-muted-foreground">
            Kandidater dyker upp här när rekryterare presenterar dem för dina
            jobb.
          </p>
        </div>
      ) : (
        <>
          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus("")}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                !filterStatus
                  ? "border-brand-500 bg-brand-100 text-brand-600"
                  : "border-border bg-background text-muted-foreground hover:border-brand-300"
              }`}
            >
              Alla ({candidates.length})
            </button>
            {Object.entries(statusCounts).map(([status, count]) => (
              <button
                key={status}
                onClick={() =>
                  setFilterStatus(filterStatus === status ? "" : status)
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filterStatus === status
                    ? "border-brand-500 bg-brand-100 text-brand-600"
                    : "border-border bg-background text-muted-foreground hover:border-brand-300"
                }`}
              >
                {statusLabels[status] || status} ({count})
              </button>
            ))}
          </div>

          {/* Candidate list */}
          <div className="space-y-3">
            {filteredCandidates.map((c) => (
              <Link
                key={c.id}
                href={`/company/candidates/${c.id}`}
                className="flex items-center justify-between rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <div>
                  <p className="font-medium">
                    {c.first_name} {c.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {c.current_title}
                    {c.current_title && c.current_company && " · "}
                    {c.current_company}
                  </p>
                  {c.jobs && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Till: {c.jobs.title}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant={statusVariants[c.status] || "secondary"}>
                    {statusLabels[c.status] || c.status}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatRelativeDate(c.submitted_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
