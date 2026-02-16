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
  status: string;
  submitted_at: string;
  jobs: { id: string; title: string; companies: { company_name: string } | null } | null;
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

export default function RecruiterCandidatesPage() {
  const { user } = useUser();
  const [candidates, setCandidates] = useState<CandidateWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user?.recruiter_id) return;

    async function fetchCandidates() {
      const { data } = await supabase
        .from("candidates")
        .select("id, first_name, last_name, current_title, status, submitted_at, jobs(id, title, companies(company_name))")
        .eq("recruiter_id", user!.recruiter_id!)
        .order("submitted_at", { ascending: false });

      if (data) setCandidates(data as unknown as CandidateWithJob[]);
      setLoading(false);
    }

    fetchCandidates();
  }, [user?.recruiter_id]);

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
        <h1 className="text-2xl font-bold">Mina kandidater</h1>
        <p className="text-muted-foreground">
          Kandidater du har presenterat
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">
            Inga kandidater presenterade
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Gå till dina mandat för att presentera kandidater.
          </p>
          <Link
            href="/recruiter/mandates"
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700"
          >
            Mina mandat
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {c.first_name} {c.last_name}
                  </p>
                  {c.current_title && (
                    <p className="text-sm text-muted-foreground">
                      {c.current_title}
                    </p>
                  )}
                  {c.jobs && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.jobs.title}
                      {c.jobs.companies && ` · ${c.jobs.companies.company_name}`}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
