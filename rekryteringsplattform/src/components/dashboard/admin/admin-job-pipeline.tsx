import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getDictionary } from "@/i18n/server";
import {
    countCandidatesAgainstCap,
    normalizeCandidateStatusForWorkflow,
    TERMINAL_CANDIDATE_STATUSES,
} from "@/lib/candidate-workflow";

type PipelineCandidate = {
    id: string;
    first_name: string;
    last_name: string;
    status: string;
    recruiter?: { profile?: { full_name?: string | null } | null } | null;
};

// "Done" fold for sort order only: hired-and-beyond and terminal rows sink to the bottom.
const DONE_STATUSES = ["hired", "invoice_enabled", "guarantee_tracking", "completed"];
function isDone(status: string): boolean {
    const s = normalizeCandidateStatusForWorkflow(status);
    return TERMINAL_CANDIDATE_STATUSES.has(s) || DONE_STATUSES.includes(s);
}

/** Admin job page → Pipeline tab. Read-only list; rows open the admin candidate view. */
export async function AdminJobPipeline({ candidates }: { candidates: PipelineCandidate[] }) {
    const dict = await getDictionary();
    const c = dict.company;

    // Drafts are unsent recruiter work — never part of the job's pipeline.
    const rows = candidates
        .filter((x) => x.status !== "draft")
        .sort((a, b) => {
            const aDone = isDone(a.status);
            const bDone = isDone(b.status);
            if (aDone !== bDone) return aDone ? 1 : -1;
            return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, "sv");
        });
    // Same cap-slot count as the admin Jobs list "X/8" badge.
    const capCount = countCandidatesAgainstCap(rows.map((x) => x.status));

    return (
        <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {c.pipelineStatCandidates}: <span className="text-slate-900">{capCount}</span>
            </p>
            {rows.length === 0 ? (
                <Card className="border-dashed border-slate-300 bg-slate-50/60">
                    <CardContent className="p-10 text-center text-slate-500">{c.pipelineNoCandidates}</CardContent>
                </Card>
            ) : (
                rows.map((candidate) => (
                    <Card key={candidate.id} className="border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                <h3 className="text-sm font-bold text-slate-900">
                                    {candidate.first_name} {candidate.last_name}
                                </h3>
                                <span className="text-slate-300">|</span>
                                <span className="text-xs text-slate-500">
                                    {dict.common.recruiter}:{" "}
                                    <span className="font-semibold text-slate-700">
                                        {candidate.recruiter?.profile?.full_name || c.pipelineRecruiterUnknown}
                                    </span>
                                </span>
                                <span className="text-slate-300">|</span>
                                <StatusBadge status={candidate.status} />
                            </div>
                            <Link href={`/admin/candidates/${candidate.id}`}>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    {c.pipelineFollowCandidate}
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}
