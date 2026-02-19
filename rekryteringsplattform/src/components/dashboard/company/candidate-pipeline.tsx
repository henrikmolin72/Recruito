"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { updateCandidateStatus } from "@/lib/actions/candidates";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const PIPELINE_STAGES = [
  { key: "submitted", label: "Presenterade", color: "bg-blue-500" },
  { key: "reviewing", label: "Under granskning", color: "bg-yellow-500" },
  { key: "interview", label: "Intervju", color: "bg-purple-500" },
  { key: "offered", label: "Erbjudande", color: "bg-brand-500" },
  { key: "hired", label: "Anställda", color: "bg-success-500" },
  { key: "paused", label: "Pausade", color: "bg-orange-400" },
  { key: "rejected", label: "Avvisade", color: "bg-slate-400" },
] as const;

type TransitionAction = { label: string; next: string; variant?: "default" | "outline" | "danger" | "ghost" };

const STATUS_TRANSITIONS: Record<string, TransitionAction[]> = {
  submitted: [
    { label: "Granska", next: "reviewing" },
    { label: "Pausa", next: "paused", variant: "outline" },
    { label: "Avvisa", next: "rejected", variant: "outline" },
  ],
  reviewing: [
    { label: "Boka intervju", next: "interview" },
    { label: "Tillbaka", next: "submitted", variant: "ghost" },
    { label: "Pausa", next: "paused", variant: "outline" },
    { label: "Avvisa", next: "rejected", variant: "outline" },
  ],
  interview: [
    { label: "Ge erbjudande", next: "offered" },
    { label: "Tillbaka", next: "reviewing", variant: "ghost" },
    { label: "Pausa", next: "paused", variant: "outline" },
    { label: "Avvisa", next: "rejected", variant: "outline" },
  ],
  offered: [
    { label: "Markera anställd", next: "hired" },
    { label: "Tillbaka", next: "interview", variant: "ghost" },
    { label: "Pausa", next: "paused", variant: "outline" },
    { label: "Avvisa", next: "rejected", variant: "outline" },
  ],
  paused: [
    { label: "Återuppta", next: "submitted" },
  ],
  rejected: [
    { label: "Återuppta", next: "submitted" },
  ],
};

interface CandidatePipelineProps {
  candidates: any[];
}

export function CandidatePipeline({ candidates }: CandidatePipelineProps) {
  const [view, setView] = useState<"pipeline" | "list">("pipeline");

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView("pipeline")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all",
            view === "pipeline" ? "bg-brand-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Pipeline
        </button>
        <button
          onClick={() => setView("list")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all",
            view === "list" ? "bg-brand-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Lista
        </button>
        <div className="ml-auto text-sm text-muted-foreground font-medium">
          {candidates.length} kandidater totalt
        </div>
      </div>

      {view === "pipeline" ? (
        <PipelineView candidates={candidates} />
      ) : (
        <ListView candidates={candidates} />
      )}
    </div>
  );
}

function PipelineView({ candidates }: { candidates: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleStatusChange = async (candidateId: string, jobId: string, newStatus: string) => {
    setLoading(candidateId);
    await updateCandidateStatus(candidateId, jobId, newStatus);
    router.refresh();
    setLoading(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {PIPELINE_STAGES.map((stage) => {
        const stageCandidates = candidates.filter(c => c.status === stage.key);

        return (
          <div key={stage.key} className="space-y-3">
            {/* Stage header */}
            <div className="flex items-center gap-2 px-1">
              <div className={cn("h-2.5 w-2.5 rounded-full", stage.color)} />
              <span className="text-sm font-bold text-slate-700">{stage.label}</span>
              <span className="ml-auto text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {stageCandidates.length}
              </span>
            </div>

            {/* Candidates in stage */}
            <div className="space-y-2 min-h-[80px]">
              {stageCandidates.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                  Inga kandidater
                </div>
              ) : (
                stageCandidates.map((candidate: any) => (
                  <Card key={candidate.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar initials={(candidate.first_name?.[0] || "") + (candidate.last_name?.[0] || "")} />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/company/jobs/${candidate.job_id}/candidates/${candidate.id}`}
                            className="font-semibold text-sm hover:text-brand-600 transition-colors"
                          >
                            {candidate.first_name} {candidate.last_name}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate">
                            {candidate.current_title || "Ingen titel"}
                          </p>
                          <p className="text-[10px] text-brand-600 font-medium mt-1">
                            {candidate.job?.title}
                          </p>
                        </div>
                      </div>

                      {/* Status actions */}
                      {STATUS_TRANSITIONS[stage.key] && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                          {STATUS_TRANSITIONS[stage.key].map((action) => (
                            <Button
                              key={action.next}
                              variant={action.variant || "default"}
                              size="sm"
                              className={cn(
                                "text-xs h-7",
                                action.variant === "outline" ? "text-muted-foreground" : ""
                              )}
                              disabled={loading === candidate.id}
                              onClick={() => handleStatusChange(candidate.id, candidate.job_id, action.next)}
                            >
                              {loading === candidate.id ? "..." : action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ candidates }: { candidates: any[] }) {
  return (
    <div className="grid gap-4">
      {candidates.map((candidate: any) => (
        <Card key={candidate.id}>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar initials={(candidate.first_name?.[0] || "") + (candidate.last_name?.[0] || "")} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{candidate.first_name} {candidate.last_name}</h3>
                  <StatusBadge status={candidate.status} />
                </div>
                <p className="text-sm text-muted-foreground">{candidate.current_title || 'Ingen titel'}</p>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">Jobb: <span className="text-foreground font-medium">{candidate.job?.title}</span></span>
                  <span className="flex items-center gap-1">Rekryterare: <span className="text-foreground font-medium">{candidate.recruiter?.profile?.full_name || 'Rekryterare'}</span></span>
                  <span className="flex items-center gap-1">Presenterad: <span className="text-foreground font-medium">{new Date(candidate.created_at).toLocaleDateString()}</span></span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/company/jobs/${candidate.job_id}/candidates/${candidate.id}`}>
                  <Button variant="outline" size="sm">Visa profil</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
