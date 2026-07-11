import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getJobProcessStats, getJobRejectionReasons } from "@/lib/actions/recruiter";
import type { JobProcessStatCounts } from "@/lib/mandate-stages";

// Aggregate pipeline counts across ALL recruiters on a job. Shown to any
// recruiter (Browse Jobs + My Mandates) near the top so they can judge at a
// glance whether to keep sourcing candidates or ease off. Counts only, no PII.
// `preloaded` lets a page that already fetched the stats (for its cap gate)
// avoid a second query.
export async function JobProcessStats({
    jobId,
    preloaded,
}: {
    jobId: string;
    preloaded?: JobProcessStatCounts | null;
}) {
    const stats = preloaded ?? (await getJobProcessStats(jobId));
    if (!stats) return null;
    // Grouped client-rejection reasons (client request 2026-07-11): shows every
    // recruiter WHY the client rejects so they can align their search. Structured
    // labels only — no candidate PII.
    const rejectionReasons = await getJobRejectionReasons(jobId);

    return (
        <Card>
            <CardContent className="p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
                    Ongoing process across all recruiters on this job
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Presented", value: stats.presented, color: "text-slate-900" },
                        { label: "In process", value: stats.inProcess, color: "text-blue-600" },
                        { label: "In interview", value: stats.inInterview, color: "text-purple-600" },
                        { label: "Rejected / withdrawn", value: stats.released, color: "text-red-600" },
                    ].map((s) => (
                        <div key={s.label} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
                            <div className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</div>
                            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>
                {rejectionReasons.length > 0 && (
                    // ponytail: native <details> — no client component needed for a toggle.
                    <details className="group mt-3">
                        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 [&::-webkit-details-marker]:hidden">
                            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                            View rejection reasons
                        </summary>
                        <ul className="mt-2 space-y-1 rounded-lg border border-slate-100 bg-slate-50 p-3">
                            {rejectionReasons.map((r) => (
                                <li key={r.reason} className="flex items-center justify-between text-xs text-slate-600">
                                    <span>{r.reason}</span>
                                    <span className="font-bold tabular-nums text-red-600">{r.count}</span>
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </CardContent>
        </Card>
    );
}
