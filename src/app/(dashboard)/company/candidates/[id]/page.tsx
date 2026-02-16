"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Mail,
  Phone,
  Linkedin,
  Briefcase,
  Building2,
  Clock,
} from "lucide-react";

interface CandidateDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  current_title: string | null;
  current_company: string | null;
  years_experience: number | null;
  expected_salary: number | null;
  cover_note: string | null;
  qualification_summary: string | null;
  status: string;
  submitted_at: string;
  rejection_reason: string | null;
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

const statusFlow: Record<string, string[]> = {
  submitted: ["reviewing", "rejected"],
  reviewing: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["hired", "declined"],
};

const actionLabels: Record<string, { label: string; variant: "advance" | "reject" }> = {
  reviewing: { label: "Granska", variant: "advance" },
  interview: { label: "Bjud till intervju", variant: "advance" },
  offered: { label: "Skicka erbjudande", variant: "advance" },
  hired: { label: "Markera som anställd", variant: "advance" },
  rejected: { label: "Avvisa", variant: "reject" },
  declined: { label: "Kandidaten tackade nej", variant: "reject" },
};

export default function CandidateDetailPage() {
  const params = useParams();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchCandidate() {
      const { data } = await supabase
        .from("candidates")
        .select("*, jobs(id, title)")
        .eq("id", params.id)
        .single();

      if (data) setCandidate(data);
      setLoading(false);
    }

    fetchCandidate();
  }, [params.id]);

  async function updateStatus(newStatus: string) {
    if (!candidate) return;
    setActionLoading(true);

    const updates: Record<string, unknown> = {
      status: newStatus,
      status_changed_at: new Date().toISOString(),
    };

    if (newStatus === "reviewing") updates.reviewed_at = new Date().toISOString();
    if (newStatus === "interview") updates.interview_at = new Date().toISOString();
    if (newStatus === "offered") updates.offered_at = new Date().toISOString();
    if (newStatus === "hired") updates.hired_at = new Date().toISOString();
    if (newStatus === "rejected" && rejectionReason) {
      updates.rejection_reason = rejectionReason;
    }

    const { error } = await supabase
      .from("candidates")
      .update(updates)
      .eq("id", candidate.id);

    if (error) {
      toast.error("Kunde inte uppdatera status", { description: error.message });
    } else {
      setCandidate({ ...candidate, ...updates } as CandidateDetail);
      toast.success(`Status uppdaterad till ${statusLabels[newStatus]}`);
      setShowRejectForm(false);
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

  if (!candidate) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-lg font-semibold">Kandidaten hittades inte</h2>
        <Link href="/company/candidates" className="mt-2 text-sm text-brand-600 hover:underline">
          Tillbaka
        </Link>
      </div>
    );
  }

  const nextStatuses = statusFlow[candidate.status] || [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/company/candidates"
          className="mt-1 rounded-md p-2 text-muted-foreground hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              {candidate.first_name} {candidate.last_name}
            </h1>
            <Badge variant="secondary">
              {statusLabels[candidate.status] || candidate.status}
            </Badge>
          </div>
          {candidate.jobs && (
            <p className="mt-1 text-sm text-muted-foreground">
              Till:{" "}
              <Link
                href={`/company/jobs/${candidate.jobs.id}`}
                className="text-brand-600 hover:underline"
              >
                {candidate.jobs.title}
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {nextStatuses.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Åtgärder</p>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => {
              const action = actionLabels[status];
              if (!action) return null;

              if (status === "rejected" || status === "declined") {
                return (
                  <button
                    key={status}
                    onClick={() => setShowRejectForm(!showRejectForm)}
                    disabled={actionLoading}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-danger-500 px-4 text-sm font-medium text-danger-500 hover:bg-danger-50 disabled:opacity-50"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    {action.label}
                  </button>
                );
              }

              return (
                <button
                  key={status}
                  onClick={() => updateStatus(status)}
                  disabled={actionLoading}
                  className="inline-flex h-9 items-center gap-1 rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ThumbsUp className="h-3.5 w-3.5" />
                  )}
                  {action.label}
                </button>
              );
            })}
          </div>

          {showRejectForm && (
            <div className="mt-3 space-y-2">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Anledning till avvisning (valfritt)..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              <button
                onClick={() => updateStatus("rejected")}
                disabled={actionLoading}
                className="inline-flex h-9 items-center rounded-md bg-danger-500 px-4 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Bekräfta avvisning
              </button>
            </div>
          )}
        </div>
      )}

      {/* Candidate info */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Kandidatinformation</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {candidate.current_title && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{candidate.current_title}</span>
            </div>
          )}
          {candidate.current_company && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{candidate.current_company}</span>
            </div>
          )}
          {candidate.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{candidate.email}</span>
            </div>
          )}
          {candidate.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{candidate.phone}</span>
            </div>
          )}
          {candidate.linkedin_url && (
            <div className="flex items-center gap-2 text-sm">
              <Linkedin className="h-4 w-4 text-muted-foreground" />
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline"
              >
                LinkedIn-profil
              </a>
            </div>
          )}
          {candidate.years_experience != null && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{candidate.years_experience} års erfarenhet</span>
            </div>
          )}
          {candidate.expected_salary != null && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Löneanspråk: {formatCurrency(candidate.expected_salary)}</span>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Presenterad {formatRelativeDate(candidate.submitted_at)}
        </p>
      </div>

      {/* Cover note */}
      {candidate.cover_note && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-3 text-lg font-semibold">
            Rekryterarens motivering
          </h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {candidate.cover_note}
          </p>
        </div>
      )}

      {/* Qualification summary */}
      {candidate.qualification_summary && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-3 text-lg font-semibold">
            Kvalifikationssammanfattning
          </h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {candidate.qualification_summary}
          </p>
        </div>
      )}

      {/* Rejection reason */}
      {candidate.rejection_reason && (
        <div className="rounded-lg border border-danger-500/30 bg-danger-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-danger-700">
            Avvisningsanledning
          </h2>
          <p className="text-sm text-danger-700">
            {candidate.rejection_reason}
          </p>
        </div>
      )}
    </div>
  );
}
