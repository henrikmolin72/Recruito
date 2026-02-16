"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FileCheck, Loader2, UserPlus, X } from "lucide-react";

interface Mandate {
  id: string;
  job_id: string;
  is_active: boolean;
  claimed_at: string;
  jobs: {
    id: string;
    title: string;
    industry: string;
    location: string;
    fee_percentage: number;
    salary_min: number | null;
    salary_max: number | null;
    status: string;
    companies: { company_name: string } | null;
  } | null;
  _candidate_count?: number;
}

export default function RecruiterMandatesPage() {
  const { user } = useUser();
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!user?.recruiter_id) return;

    async function fetchMandates() {
      const { data } = await supabase
        .from("job_mandates")
        .select("*, jobs(id, title, industry, location, fee_percentage, salary_min, salary_max, status, companies(company_name))")
        .eq("recruiter_id", user!.recruiter_id!)
        .order("claimed_at", { ascending: false });

      if (data) {
        const enriched = await Promise.all(
          data.map(async (m) => {
            const { count } = await supabase
              .from("candidates")
              .select("*", { count: "exact", head: true })
              .eq("mandate_id", m.id);
            return { ...m, _candidate_count: count || 0 };
          })
        );
        setMandates(enriched);
      }
      setLoading(false);
    }

    fetchMandates();
  }, [user?.recruiter_id]);

  async function releaseMandate(mandateId: string) {
    setReleasingId(mandateId);
    const { error } = await supabase
      .from("job_mandates")
      .update({ is_active: false, released_at: new Date().toISOString() })
      .eq("id", mandateId);

    if (error) {
      toast.error("Kunde inte släppa mandatet", { description: error.message });
    } else {
      toast.success("Mandat släppt");
      setMandates((prev) =>
        prev.map((m) => (m.id === mandateId ? { ...m, is_active: false } : m))
      );
    }
    setReleasingId(null);
  }

  const activeMandates = mandates.filter((m) => m.is_active);
  const pastMandates = mandates.filter((m) => !m.is_active);

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
        <h1 className="text-2xl font-bold">Mina mandat</h1>
        <p className="text-muted-foreground">
          Jobb du har tagit på dig att rekrytera för
        </p>
      </div>

      {mandates.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <FileCheck className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">Inga mandat ännu</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Bläddra bland tillgängliga jobb och ta ditt första uppdrag.
          </p>
          <Link
            href="/recruiter/jobs"
            className="inline-flex h-10 items-center justify-center rounded-md bg-success-500 px-6 text-sm font-medium text-white hover:bg-success-700"
          >
            Bläddra jobb
          </Link>
        </div>
      ) : (
        <>
          {/* Active mandates */}
          {activeMandates.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">
                Aktiva ({activeMandates.length})
              </h2>
              <div className="space-y-4">
                {activeMandates.map((m) => (
                  <MandateCard
                    key={m.id}
                    mandate={m}
                    onRelease={() => releaseMandate(m.id)}
                    releasing={releasingId === m.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past mandates */}
          {pastMandates.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-muted-foreground">
                Avslutade ({pastMandates.length})
              </h2>
              <div className="space-y-4 opacity-60">
                {pastMandates.map((m) => (
                  <MandateCard key={m.id} mandate={m} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MandateCard({
  mandate,
  onRelease,
  releasing,
}: {
  mandate: Mandate;
  onRelease?: () => void;
  releasing?: boolean;
}) {
  const job = mandate.jobs;
  if (!job) return null;

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{job.title}</h3>
          <p className="text-sm text-muted-foreground">
            {job.companies?.company_name} · {job.location}
          </p>
          <div className="mt-2 flex gap-2">
            <Badge variant="secondary">{job.industry}</Badge>
            <Badge variant="secondary">{job.fee_percentage}% avgift</Badge>
            {(job.salary_min || job.salary_max) && (
              <Badge variant="outline">
                {job.salary_min && job.salary_max
                  ? `${formatCurrency(job.salary_min)} – ${formatCurrency(job.salary_max)}`
                  : job.salary_min
                    ? `Från ${formatCurrency(job.salary_min)}`
                    : `Upp till ${formatCurrency(job.salary_max!)}`}
              </Badge>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-medium">{mandate._candidate_count} kandidater</p>
          <p className="text-xs text-muted-foreground">
            Taget {formatRelativeDate(mandate.claimed_at)}
          </p>
        </div>
      </div>

      {mandate.is_active && (
        <div className="mt-4 flex gap-2 border-t pt-4">
          <Link
            href={`/recruiter/candidates/new?mandate=${mandate.id}&job=${job.id}`}
            className="inline-flex h-9 items-center gap-1 rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Presentera kandidat
          </Link>
          <button
            onClick={onRelease}
            disabled={releasing}
            className="inline-flex h-9 items-center gap-1 rounded-md border px-4 text-sm font-medium text-muted-foreground hover:bg-gray-100 disabled:opacity-50"
          >
            {releasing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            Släpp mandat
          </button>
        </div>
      )}
    </div>
  );
}
