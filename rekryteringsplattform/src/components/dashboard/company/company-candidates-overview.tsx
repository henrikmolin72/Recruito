import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import type { PipelineStage } from "@/types/db-types";
import { ArrowRight, GitBranch, Users, UserCheck, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeCandidateStatusForWorkflow, TERMINAL_CANDIDATE_STATUSES } from "@/lib/candidate-workflow";

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

function sortStages(stages: PipelineStage[] | null | undefined): PipelineStage[] {
    return [...(stages || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getStepLabel(candidate: CandidateItem, pipelineStages: PipelineStage[]) {
    const stage = pipelineStages.find((s) => s.id === candidate.current_pipeline_stage);
    if (stage) return stage.title;
    const status = normalizeCandidateStatusForWorkflow(candidate.status);

    const labels: Record<string, string> = {
        submitted: "Presenterad",
        reviewing: "Under granskning",
        under_client_review: "Under kundgranskning",
        info_requested: "Mer info begärd",
        resubmitted: "Återinskickad",
        interview: "Intervju",
        interview_stage_1: "Intervju steg 1",
        interview_stage_2: "Intervju steg 2",
        interview_stage_3: "Intervju steg 3",
        final_interview: "Slutintervju",
        offered: "Erbjudande",
        offer_in_progress: "Erbjudande pågår",
        offer_accepted: "Erbjudande accepterat",
        invoice_enabled: "Faktura aktiv",
        guarantee_tracking: "Garantispårning",
        hired: "Anställd",
        completed: "Avslutad",
        rejected: "Avböjd",
        duplicate_rejected: "Dublett avvisad",
        client_already_engaged: "Kunden redan engagerad",
        rejected_client: "Avvisad av kund",
        rejected_interview: "Avvisad i intervju",
        offer_declined: "Erbjudande avböjt",
        candidate_withdrawn: "Kandidat drog sig ur",
        declined: "Avböjd",
        paused: "Pausad",
        on_hold: "On hold",
    };
    return labels[status] || labels[candidate.status] || "Pågår";
}

function getProgress(candidate: CandidateItem, pipelineStages: PipelineStage[]) {
    const stages = pipelineStages;
    const total = Math.max(stages.length + 3, 4); // submitted + custom + offered + decision
    const status = normalizeCandidateStatusForWorkflow(candidate.status);

    if (status === "on_hold" || status === "paused") return { value: 0.4, tone: "paused" as const };
    if (TERMINAL_CANDIDATE_STATUSES.has(status) || ["hired", "invoice_enabled", "guarantee_tracking"].includes(status)) {
        return {
            value: 1,
            tone: ["duplicate_rejected", "client_already_engaged", "rejected_client", "rejected_interview", "offer_declined", "candidate_withdrawn", "rejected", "declined"].includes(status)
                ? ("negative" as const)
                : ("positive" as const)
        };
    }
    if (["offered", "offer_in_progress", "offer_accepted"].includes(status)) return { value: (stages.length + 2) / total, tone: "default" as const };

    const idx = stages.findIndex((s) => s.id === candidate.current_pipeline_stage);
    if (idx >= 0) return { value: (idx + 2) / total, tone: "default" as const };

    if (["interview", "interview_stage_1", "interview_stage_2", "interview_stage_3", "final_interview"].includes(status)) {
        const interviewStageIdx = stages.findIndex((s) => s.type === "interview");
        if (interviewStageIdx >= 0) return { value: (interviewStageIdx + 2) / total, tone: "default" as const };
        return { value: 0.45, tone: "default" as const };
    }

    if (["reviewing", "under_client_review", "info_requested", "resubmitted"].includes(status)) return { value: 0.25, tone: "default" as const };
    return { value: 0.1, tone: "default" as const };
}

export function CompanyCandidatesOverview({
    candidates,
    jobId,
    pipelineStages,
}: {
    candidates: CandidateItem[];
    jobId: string;
    pipelineStages: PipelineStage[];
}) {
    const sortedStages = sortStages(pipelineStages);

    const total = candidates.length;
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
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kandidater</p>
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
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aktiva processer</p>
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
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aktiva rekryterare</p>
                            <p className="text-lg font-bold text-slate-900">{uniqueRecruiters}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-3">
                {sortedCandidates.length === 0 ? (
                    <Card className="border-dashed border-slate-300 bg-slate-50/60">
                        <CardContent className="p-10 text-center text-slate-500">
                            Inga kandidater ännu.
                        </CardContent>
                    </Card>
                ) : (
                    sortedCandidates.map((candidate) => {
                        const progress = getProgress(candidate, sortedStages);
                        const progressClass =
                            progress.tone === "negative"
                                ? "bg-rose-400"
                                : progress.tone === "positive"
                                    ? "bg-emerald-500"
                                    : progress.tone === "paused"
                                        ? "bg-orange-400"
                                        : "bg-brand-500";

                        return (
                            <Card key={candidate.id} className="border-slate-200 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-bold text-slate-900">
                                                    {candidate.first_name} {candidate.last_name}
                                                </h3>
                                                <StatusBadge status={candidate.status} />
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                                <span>{candidate.current_title || "Ingen titel angiven"}</span>
                                                <span className="text-slate-300">•</span>
                                                <span>
                                                    Rekryterare: <span className="font-semibold text-slate-700">{candidate.recruiter?.profile?.full_name || "Okänd"}</span>
                                                </span>
                                            </div>

                                            <div className="mt-3">
                                                <div className="flex items-center justify-between gap-3 text-xs">
                                                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                                        <CircleDot className="h-3.5 w-3.5 text-brand-500" />
                                                        {getStepLabel(candidate, sortedStages)}
                                                    </span>
                                                    <span className="text-slate-400">Uppdateras av rekryteraren</span>
                                                </div>
                                                <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all", progressClass)}
                                                        style={{ width: `${Math.max(8, Math.round(progress.value * 100))}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Link href={`/company/jobs/${jobId}/candidates/${candidate.id}`}>
                                                <Button variant="outline" size="sm" className="gap-1.5">
                                                    Följ kandidat
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
