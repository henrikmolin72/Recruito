import { Card, CardContent } from "@/components/ui/card";
import { getJobProcessStats } from "@/lib/actions/recruiter";

// Aggregate pipeline counts across ALL recruiters on a job. Shown to any
// recruiter (Browse Jobs + My Mandates) near the top so they can judge at a
// glance whether to keep sourcing candidates or ease off. Counts only, no PII.
export async function JobProcessStats({ jobId }: { jobId: string }) {
    const stats = await getJobProcessStats(jobId);
    if (!stats) return null;

    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-baseline justify-between mb-4">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Ongoing process</h2>
                    <p className="text-xs text-muted-foreground">Across all recruiters on this job</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Presented", value: stats.presented, color: "text-slate-900" },
                        { label: "In process", value: stats.inProcess, color: "text-blue-600" },
                        { label: "In interview", value: stats.inInterview, color: "text-purple-600" },
                        { label: "Rejected", value: stats.rejected, color: "text-red-600" },
                    ].map((s) => (
                        <div key={s.label} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
                            <div className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</div>
                            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
