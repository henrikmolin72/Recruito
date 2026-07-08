"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { MarkdownReport } from "@/components/screening/markdown-report";
import { getMatchLevel, type MatchTier } from "@/lib/screening/match-level";
import type { StoredEvaluation } from "@/lib/actions/screening";

// Mirrors the recruiter screening panel's error mapping so the admin sees the
// same human-readable reasons instead of raw API codes.
const RUN_ERRORS: Record<string, string> = {
  no_cv: "No CV is uploaded for this candidate.",
  unsupported_cv_format: "CV format not supported for automatic screening (PDF/TXT only).",
};

// Admin AI-Match panel: score + Run/Re-run + full report. Renders the report from
// the LIVE API response (like the recruiter panel) instead of relying solely on a
// server refetch of the persisted row — that reliance was the "button runs but no
// report" bug: a swallowed candidate_screenings insert left nothing to refresh.
export function AdminScreeningPanel({
  candidateId,
  mandateId,
  score,
  initialReport,
}: {
  candidateId: string;
  mandateId: string;
  score: number | null;
  initialReport: StoredEvaluation | null;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<StoredEvaluation | null>(initialReport);

  // Admin (Recruito) sees the full four-tier scale INCLUDING "Not Recommended"
  // plus the raw number — unlike the client, who only ever sees Excellent/Strong/
  // Good. Boundaries come from the canonical getMatchLevel (75/85/95).
  const level = getMatchLevel(score);
  const ADMIN_LABELS: Record<MatchTier, string | null> = {
    excellent: "Excellent Match",
    strong: "Strong Match",
    good: "Good Match",
    notRecommended: "Not Recommended",
    unscored: null,
  };
  const tierLabel = ADMIN_LABELS[level.tier];
  const scoreColor =
    level.tone === "success" ? "text-emerald-600" : level.tone === "danger" ? "text-red-500" : "text-slate-500";

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/screening-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, mandateId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(RUN_ERRORS[json?.error] || json?.error || "Screening failed. Please try again.");
        return;
      }
      // Show the report immediately from the response, then refresh so the
      // server-rendered score picks up the value Recruito's run just set.
      setReport({ reportMarkdown: json.reportMarkdown, modelVersion: json.modelVersion, createdAt: json.createdAt });
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {score === null ? (
            <span className="text-sm text-muted-foreground">No AI match score yet.</span>
          ) : (
            <>
              <span className={`text-4xl font-black tabular-nums ${scoreColor}`}>{score}%</span>
              {tierLabel && <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{tierLabel}</span>}
            </>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Button onClick={run} disabled={running} variant="outline" size="sm" className="gap-2 whitespace-nowrap">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {running ? "Running…" : report ? "Re-run AI screening" : "Run AI screening"}
          </Button>
          {error && <p className="max-w-xs text-right text-xs text-red-600">{error}</p>}
        </div>
      </div>

      {report ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="mb-2 text-xs text-muted-foreground" suppressHydrationWarning>
            Full screening report · {report.modelVersion} · {new Date(report.createdAt).toLocaleString()}
          </p>
          <MarkdownReport markdown={report.reportMarkdown} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No screening report yet — run AI screening to generate the full evaluation.
        </p>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        Decision support only — not an automated hiring decision.
      </p>
    </>
  );
}
