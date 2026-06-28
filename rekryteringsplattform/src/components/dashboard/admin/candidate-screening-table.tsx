"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { TakeActionButton } from "@/components/dashboard/admin/take-action-button";
import { cn } from "@/lib/utils";
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

export function CandidateScreeningTable({ candidates }: { candidates: ScreeningCandidate[] }) {
    // Default mirrors the server order (created_at DESC) so the active arrow is honest
    // and a user can always toggle back to it.
    const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection }>({
        column: "createdAt",
        direction: "desc",
    });

    const rows = useMemo(
        () => sortCandidates(candidates, sort.column, sort.direction),
        [candidates, sort],
    );

    function toggle(column: SortColumn) {
        setSort((prev) =>
            prev.column === column
                ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { column, direction: "asc" },
        );
    }

    return (
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
                            <td className="p-4 text-xs text-muted-foreground">
                                {new Date(c.createdAt).toLocaleDateString()}
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
    );
}
