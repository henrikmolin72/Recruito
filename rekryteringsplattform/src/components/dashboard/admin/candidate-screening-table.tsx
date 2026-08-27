"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { TakeActionButton } from "@/components/dashboard/admin/take-action-button";
import { cn, formatDateShort } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import {
    companyStageBucket,
    COMPANY_STAGE_BUCKETS,
    type CompanyStageBucket,
} from "@/lib/company-candidate-buckets";
import {
    sortCandidates,
    type ScreeningCandidate,
    type SortColumn,
    type SortDirection,
} from "@/components/dashboard/admin/sort-candidates";

const COLUMNS: { key: SortColumn; label: string; thClass?: string }[] = [
    { key: "name", label: "Candidate" },
    { key: "jobTitle", label: "Job" },
    { key: "companyName", label: "Company" },
    { key: "recruiterName", label: "Recruiter" },
    { key: "aiMatchScore", label: "AI Match" },
    { key: "status", label: "Status" },
    { key: "createdAt", label: "Submitted" },
    { key: "screening", label: "Screening", thClass: "text-emerald-700" },
];

// Same buckets/labels/dots as the company candidates page (client request
// 2026-08-27: "same tabs in candidates page in Admin panel").
const BUCKET_META: Record<CompanyStageBucket, { labelKey: string; dot: string }> = {
    under_review: { labelKey: "components.pipelineUnderReview", dot: "bg-yellow-500" },
    interview: { labelKey: "components.pipelineInterview", dot: "bg-purple-500" },
    offered: { labelKey: "components.pipelineOffer", dot: "bg-brand-500" },
    hired: { labelKey: "components.pipelineHired", dot: "bg-success-500" },
    rejected: { labelKey: "components.pipelineRejected", dot: "bg-slate-400" },
    withdrawn: { labelKey: "components.pipelineWithdrawn", dot: "bg-zinc-400" },
};

export function CandidateScreeningTable({ candidates }: { candidates: ScreeningCandidate[] }) {
    const { t } = useTranslations();
    // Default mirrors the server order (created_at DESC) so the active arrow is honest
    // and a user can always toggle back to it.
    const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection }>({
        column: "createdAt",
        direction: "desc",
    });
    const [activeTab, setActiveTab] = useState<"all" | CompanyStageBucket>("all");
    const [search, setSearch] = useState("");
    const [jobFilter, setJobFilter] = useState("all");

    const counts = useMemo(() => {
        const c = {} as Record<CompanyStageBucket, number>;
        for (const bucket of COMPANY_STAGE_BUCKETS) c[bucket] = 0;
        for (const cand of candidates) c[companyStageBucket(cand.status)]++;
        return c;
    }, [candidates]);

    // Admin sees jobs across companies, so the option label carries both.
    const jobs = useMemo(
        () =>
            [...new Map(
                candidates
                    .filter((c) => c.jobId)
                    .map((c) => [c.jobId as string, `${c.jobTitle} — ${c.companyName}`]),
            )].map(([id, label]) => ({ id, label })),
        [candidates],
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return candidates.filter((cand) => {
            if (activeTab !== "all" && companyStageBucket(cand.status) !== activeTab) return false;
            if (jobFilter !== "all" && cand.jobId !== jobFilter) return false;
            if (q && !cand.name.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [candidates, activeTab, jobFilter, search]);

    const rows = useMemo(
        () => sortCandidates(filtered, sort.column, sort.direction),
        [filtered, sort],
    );

    function toggle(column: SortColumn) {
        setSort((prev) =>
            prev.column === column
                ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { column, direction: "asc" },
        );
    }

    return (
        <div className="space-y-4">
            {/* Stage tabs — mirrors the company candidates page */}
            <div className="flex items-center gap-2 overflow-x-auto rounded-xl border bg-card p-2">
                {(["all", ...COMPANY_STAGE_BUCKETS] as const).map((bucket) => (
                    <button
                        key={bucket}
                        onClick={() => setActiveTab(bucket)}
                        className={cn(
                            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                            activeTab === bucket
                                ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                                : "text-muted-foreground hover:bg-muted",
                        )}
                    >
                        {bucket !== "all" && <span className={cn("h-2 w-2 rounded-full", BUCKET_META[bucket].dot)} />}
                        {t(bucket === "all" ? "components.pipelineAll" : BUCKET_META[bucket].labelKey)}
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
                            {bucket === "all" ? candidates.length : counts[bucket]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("components.candidateSearchPlaceholder")}
                    className="h-9 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-brand-200 sm:max-w-xs"
                />
                <select
                    value={jobFilter}
                    onChange={(e) => setJobFilter(e.target.value)}
                    className="h-9 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-brand-200 sm:w-auto"
                >
                    <option value="all">{t("components.candidateAllJobs")}</option>
                    {jobs.map((job) => (
                        <option key={job.id} value={job.id}>{job.label}</option>
                    ))}
                </select>
                <div className="text-sm font-medium text-muted-foreground sm:ml-auto">
                    {t("common.candidatesTotalCount").replace("{count}", String(filtered.length))}
                </div>
            </div>

            <Card>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm min-w-[960px]">
                        <thead>
                            <tr className="border-b border-border text-left">
                                {COLUMNS.map(({ key, label, thClass }) => {
                                    const active = sort.column === key;
                                    return (
                                        <th
                                            key={key}
                                            scope="col"
                                            aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                                            className={cn("p-4 font-medium", thClass ?? "text-muted-foreground")}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggle(key)}
                                                aria-label={`Sort by ${label}`}
                                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                                            >
                                                {label}
                                                {active ? (
                                                    sort.direction === "asc" ? (
                                                        <ChevronUp className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    )
                                                ) : (
                                                    <ChevronUp className="h-3.5 w-3.5 opacity-0" />
                                                )}
                                            </button>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="p-8 text-center text-muted-foreground">
                                        No candidates submitted yet.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((c) => (
                                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                                        <td className="p-4">
                                            <Link
                                                href={`/admin/candidates/${c.id}`}
                                                className="font-medium text-brand-600 hover:underline"
                                            >
                                                {c.name}
                                            </Link>
                                            {c.currentTitle && (
                                                <div className="text-xs text-muted-foreground">{c.currentTitle}</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-muted-foreground">{c.jobTitle}</td>
                                        <td className="p-4 text-muted-foreground">{c.companyName}</td>
                                        <td className="p-4 text-muted-foreground">{c.recruiterName}</td>
                                        <td className="p-4 tabular-nums">
                                            {c.aiMatchScore !== null && c.aiMatchScore !== undefined ? (
                                                <Link
                                                    href={`/admin/candidates/${c.id}#ai-match`}
                                                    className="font-semibold text-brand-600 hover:underline"
                                                >
                                                    {c.aiMatchScore}%
                                                </Link>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td className="p-4"><StatusBadge status={c.status} /></td>
                                        {/* Fixed locale — bare toLocaleDateString() differs between the
                                            server and browser locale and broke hydration. */}
                                        <td className="p-4 text-xs text-muted-foreground">
                                            {formatDateShort(c.createdAt)}
                                        </td>
                                        <td className="p-4">
                                            <TakeActionButton
                                                candidateId={c.id}
                                                alreadyScreened={Boolean(c.screenedAt)}
                                                rejected={c.status === "recruito_rejected"}
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
