import { Button } from "@/components/ui/button";
import { CandidateAccessGate } from "@/components/dashboard/company/candidate-access-gate";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ArrowRight, GitBranch, Users, UserCheck } from "lucide-react";
import { normalizeCandidateStatusForWorkflow, TERMINAL_CANDIDATE_STATUSES, countCandidatesAgainstCap } from "@/lib/candidate-workflow";
import { getDictionary } from "@/i18n/server";

type CandidateItem = {
    id: string;
    first_name: string;
    last_name: string;
    current_title?: string | null;
    status: string;
    current_pipeline_stage?: string | null;
    recruiter?: {
        profile?: {
            full_name?: string | null;
        };
    };
};

export async function CompanyCandidatesOverview({
    candidates,
    jobId,
    noticeAccepted,
}: {
    candidates: CandidateItem[];
    jobId: string;
    noticeAccepted: boolean;
}) {
    const dict = await getDictionary();
    const c = dict.company;

    // "Candidates" box = candidates occupying a cap slot (excludes rejected,
    // withdrawn and drafts) — the same countCandidatesAgainstCap the admin "X/8"
    // badge and the auto-pause use, so the company sees the number that actually
    // drives the cap/pause instead of a lifetime total that included rejects.
    const total = countCandidatesAgainstCap(candidates.map((c) => c.status));
    const active = candidates.filter((c) => {
        const status = normalizeCandidateStatusForWorkflow(c.status);
        return !(TERMINAL_CANDIDATE_STATUSES.has(status) || ["hired", "invoice_enabled", "guarantee_tracking", "completed"].includes(status));
    }).length;
    const uniqueRecruiters = new Set(
        candidates.map((c) => c.recruiter?.profile?.full_name).filter(Boolean)
    ).size;

    const sortedCandidates = [...candidates].sort((a, b) => {
        const aStatus = normalizeCandidateStatusForWorkflow(a.status);
        const bStatus = normalizeCandidateStatusForWorkflow(b.status);
        const aDone = TERMINAL_CANDIDATE_STATUSES.has(aStatus) || ["hired", "invoice_enabled", "guarantee_tracking", "completed"].includes(aStatus);
        const bDone = TERMINAL_CANDIDATE_STATUSES.has(bStatus) || ["hired", "invoice_enabled", "guarantee_tracking", "completed"].includes(bStatus);
        if (aDone !== bDone) return aDone ? 1 : -1;
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, "sv");
    });

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border-slate-200">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.pipelineStatCandidates}</p>
                            <p className="text-lg font-bold text-slate-900">{total}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                            <GitBranch className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.pipelineStatActiveProcesses}</p>
                            <p className="text-lg font-bold text-slate-900">{active}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                            <UserCheck className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.pipelineStatActiveRecruiters}</p>
                            <p className="text-lg font-bold text-slate-900">{uniqueRecruiters}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-3">
                {sortedCandidates.length === 0 ? (
                    <Card className="border-dashed border-slate-300 bg-slate-50/60">
                        <CardContent className="p-10 text-center text-slate-500">
                            {c.pipelineNoCandidates}
                        </CardContent>
                    </Card>
                ) : (
                    sortedCandidates.map((candidate) => (
                        <Card key={candidate.id} className="border-slate-200 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                        <h3 className="text-sm font-bold text-slate-900">
                                            {candidate.first_name} {candidate.last_name}
                                        </h3>
                                        <span className="text-slate-300">|</span>
                                        <span className="text-xs text-slate-500">
                                            {dict.common.recruiter}: <span className="font-semibold text-slate-700">{candidate.recruiter?.profile?.full_name || c.pipelineRecruiterUnknown}</span>
                                        </span>
                                        <span className="text-slate-300">|</span>
                                        <StatusBadge status={candidate.status} />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <CandidateAccessGate
                                            href={`/company/jobs/${jobId}/candidates/${candidate.id}`}
                                            noticeAccepted={noticeAccepted}
                                        >
                                            <Button variant="outline" size="sm" className="gap-1.5">
                                                {c.pipelineFollowCandidate}
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </CandidateAccessGate>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
