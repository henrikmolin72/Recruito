"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Loader2, Check, X, Clock } from "lucide-react";

interface RecruiterWithProfile {
  id: string;
  user_id: string;
  headline: string | null;
  specializations: string[];
  years_experience: number | null;
  linkedin_url: string | null;
  approval_status: string;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
}

const statusLabels: Record<string, string> = {
  pending: "Väntar",
  approved: "Godkänd",
  rejected: "Avvisad",
  suspended: "Avstängd",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  suspended: "destructive",
};

export default function AdminRecruitersPage() {
  const [recruiters, setRecruiters] = useState<RecruiterWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("pending");
  const supabase = createClient();

  useEffect(() => {
    async function fetchRecruiters() {
      const { data } = await supabase
        .from("recruiters")
        .select("*, profiles(full_name, email)")
        .order("created_at", { ascending: false });

      if (data) setRecruiters(data);
      setLoading(false);
    }

    fetchRecruiters();
  }, []);

  async function updateApproval(recruiterId: string, newStatus: string) {
    setActionLoadingId(recruiterId);

    const updates: Record<string, unknown> = { approval_status: newStatus };
    if (newStatus === "approved") {
      updates.approved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("recruiters")
      .update(updates)
      .eq("id", recruiterId);

    if (error) {
      toast.error("Kunde inte uppdatera", { description: error.message });
    } else {
      setRecruiters((prev) =>
        prev.map((r) =>
          r.id === recruiterId ? { ...r, ...updates } as RecruiterWithProfile : r
        )
      );
      toast.success(`Rekryterare ${statusLabels[newStatus].toLowerCase()}`);
    }
    setActionLoadingId(null);
  }

  const filtered = filterStatus
    ? recruiters.filter((r) => r.approval_status === filterStatus)
    : recruiters;

  const counts = recruiters.reduce(
    (acc, r) => {
      acc[r.approval_status] = (acc[r.approval_status] || 0) + 1;
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
        <h1 className="text-2xl font-bold">Rekryterare</h1>
        <p className="text-muted-foreground">
          Godkänn och hantera rekryterare på plattformen
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus("")}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            !filterStatus
              ? "border-brand-500 bg-brand-100 text-brand-600"
              : "border-border bg-background text-muted-foreground hover:border-brand-300"
          }`}
        >
          Alla ({recruiters.length})
        </button>
        {(["pending", "approved", "rejected", "suspended"] as const).map(
          (status) =>
            (counts[status] || 0) > 0 && (
              <button
                key={status}
                onClick={() => setFilterStatus(filterStatus === status ? "" : status)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filterStatus === status
                    ? "border-brand-500 bg-brand-100 text-brand-600"
                    : "border-border bg-background text-muted-foreground hover:border-brand-300"
                }`}
              >
                {statusLabels[status]} ({counts[status]})
              </button>
            )
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <UserCheck className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">
            {filterStatus === "pending"
              ? "Inga väntande godkännanden"
              : "Inga rekryterare att visa"}
          </h2>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {r.profiles?.full_name || "Okänd"}
                    </h3>
                    <Badge variant={statusVariants[r.approval_status]}>
                      {statusLabels[r.approval_status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {r.profiles?.email}
                  </p>
                  {r.headline && (
                    <p className="mt-1 text-sm">{r.headline}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.specializations?.map((spec) => (
                      <Badge key={spec} variant="secondary">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    {r.years_experience != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {r.years_experience} år
                      </span>
                    )}
                    {r.linkedin_url && (
                      <a
                        href={r.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        LinkedIn
                      </a>
                    )}
                    <span>Registrerad {formatRelativeDate(r.created_at)}</span>
                  </div>
                </div>

                {r.approval_status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateApproval(r.id, "approved")}
                      disabled={actionLoadingId === r.id}
                      className="inline-flex h-9 items-center gap-1 rounded-md bg-success-500 px-4 text-sm font-medium text-white hover:bg-success-700 disabled:opacity-50"
                    >
                      {actionLoadingId === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Godkänn
                    </button>
                    <button
                      onClick={() => updateApproval(r.id, "rejected")}
                      disabled={actionLoadingId === r.id}
                      className="inline-flex h-9 items-center gap-1 rounded-md border border-danger-500 px-4 text-sm font-medium text-danger-500 hover:bg-danger-50 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Avvisa
                    </button>
                  </div>
                )}

                {r.approval_status === "approved" && (
                  <button
                    onClick={() => updateApproval(r.id, "suspended")}
                    disabled={actionLoadingId === r.id}
                    className="inline-flex h-9 items-center gap-1 rounded-md border px-4 text-sm font-medium text-muted-foreground hover:bg-gray-100 disabled:opacity-50"
                  >
                    Stäng av
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
