"use client";

import { useState } from "react";
import { Users, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface TalentPoolEntry {
    id: string;
    notes: string | null;
    tags: string[];
    created_at: string;
    candidate?: {
        id: string;
        first_name: string;
        last_name: string;
        current_title: string | null;
        current_company: string | null;
        years_experience: number | null;
        status: string;
        ai_match_score: number | null;
        job?: { id: string; title: string } | null;
    } | null;
    application?: {
        id: string;
        full_name: string;
        status: string;
        created_at: string;
        screening?: { match_score: number | null; analysis_json: Record<string, unknown> } | null;
    } | null;
}

interface TalentPoolListProps {
    initialEntries: TalentPoolEntry[];
}

function scoreColor(score: number | null) {
    if (!score) return "outline";
    if (score > 70) return "success" as const;
    if (score >= 40) return "warning" as const;
    return "danger" as const;
}

export function TalentPoolList({ initialEntries }: TalentPoolListProps) {
    const [entries, setEntries] = useState(initialEntries);
    const [removing, setRemoving] = useState<string | null>(null);

    async function handleRemove(entryId: string) {
        setRemoving(entryId);
        try {
            const res = await fetch(`/api/talent-pool?entryId=${entryId}`, { method: "DELETE" });
            if (res.ok) {
                setEntries((prev) => prev.filter((e) => e.id !== entryId));
            }
        } finally {
            setRemoving(null);
        }
    }

    if (entries.length === 0) {
        return (
            <div className="py-20 flex flex-col items-center text-center text-slate-400 gap-4">
                <Users className="h-12 w-12 opacity-20" />
                <div>
                    <p className="font-semibold text-slate-600">Your talent pool is empty</p>
                    <p className="text-sm mt-1">
                        Save candidates from job pipelines or application lists to build your pool.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {entries.map((entry) => {
                const isCandidate = !!entry.candidate;
                const name = isCandidate
                    ? `${entry.candidate!.first_name} ${entry.candidate!.last_name}`
                    : entry.application?.full_name ?? "Unknown";
                const title = entry.candidate?.current_title ?? null;
                const company = entry.candidate?.current_company ?? null;
                const yearsExp = entry.candidate?.years_experience ?? null;
                const score = isCandidate
                    ? entry.candidate?.ai_match_score
                    : (entry.application?.screening as any)?.match_score ?? null;
                const jobTitle = entry.candidate?.job?.title ?? null;
                const profileHref = isCandidate
                    ? `/company/candidates/${entry.candidate!.id}`
                    : null;

                return (
                    <Card key={entry.id} className="border-slate-200 hover:border-slate-300 transition-colors">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                {/* Avatar initials */}
                                <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                                    <span className="text-sm font-bold text-brand-700">
                                        {name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-slate-900">{name}</span>
                                        {score != null && (
                                            <Badge variant={scoreColor(score)} className="text-[10px]">
                                                AI {score}/100
                                            </Badge>
                                        )}
                                        {entry.tags.map((tag) => (
                                            <Badge key={tag} variant="outline" className="text-[10px]">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                    <p className="text-sm text-slate-500 truncate">
                                        {[title, company].filter(Boolean).join(" · ")}
                                        {yearsExp != null && ` · ${yearsExp}y exp`}
                                        {jobTitle && ` · Applied: ${jobTitle}`}
                                    </p>
                                    {entry.notes && (
                                        <p className="text-xs text-slate-400 mt-1 truncate">{entry.notes}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] text-slate-400">
                                        Saved {formatDate(entry.created_at)}
                                    </span>
                                    {profileHref && (
                                        <Link href={profileHref}>
                                            <Button variant="outline" size="sm" className="gap-1.5">
                                                <ExternalLink className="h-3.5 w-3.5" /> View
                                            </Button>
                                        </Link>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemove(entry.id)}
                                        disabled={removing === entry.id}
                                        className="text-slate-400 hover:text-red-500"
                                    >
                                        {removing === entry.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
