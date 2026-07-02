import { Card, CardContent } from "@/components/ui/card";
import { extractMatchScore } from "@/lib/screening/extract-match-score";
import { extractCriticalGaps } from "@/lib/screening/extract-critical-gaps";
import type { StoredEvaluation } from "@/lib/actions/screening";

// Recruiter-facing AI screening summary: match score + top gaps only. Recruiters
// never see the full report — that is a client-only decision-support tool (client
// request 2026-07-02: the full report can wrongly imply a high scorer must
// advance, when clients reject for reasons AI can't see). Score/gaps are derived
// from the stored report so this stays in sync with what the company's score shows.
export function ScreeningSummaryCard({
  report,
  dict,
}: {
  report: StoredEvaluation | null;
  dict: Record<string, string>;
}) {
  if (!report) return null;
  const score = extractMatchScore(report.reportMarkdown);
  const gaps = extractCriticalGaps(report.reportMarkdown);
  const scoreColor =
    score == null ? "text-slate-900" : score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          {dict.aiEvalTitle || "AI screening"}
        </h2>
        {score != null && (
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black tabular-nums ${scoreColor}`}>{score}%</span>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {dict.aiScreenScore || "AI Match Score"}
            </span>
          </div>
        )}
        {gaps.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              {dict.aiScreenGaps || "Critical gaps"}
            </p>
            <ul className="space-y-1">
              {gaps.map((g, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-2">
                  <span aria-hidden className="text-amber-500">⚠</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {dict.aiScreenDisclaimer ||
            "Decision support only — not an automated decision. The full report stays in Recruito."}
        </p>
      </CardContent>
    </Card>
  );
}
