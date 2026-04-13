"use client";

import { ShieldCheck, FileText, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AiTransparencyCardProps {
    model: string;
    promptHash: string;
    screenedAt: string;
    score: number;
    reasoning: string[];
    reviewerName?: string;
    reviewedAt?: string;
    className?: string;
}

function formatDateTime(iso: string) {
    try {
        return new Intl.DateTimeFormat("sv-SE", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

export function AiTransparencyCard({
    model,
    promptHash,
    screenedAt,
    score,
    reasoning,
    reviewerName,
    reviewedAt,
    className,
}: AiTransparencyCardProps) {
    // Estimate factor weights from reasoning length (simple heuristic)
    const factors = reasoning.map((r, i) => {
        const weight = Math.round((score / reasoning.length) * (reasoning.length - i) / ((reasoning.length + 1) / 2));
        return { text: r, weight: Math.min(weight, score) };
    });

    return (
        <Card className={cn("border-blue-200 bg-blue-50/30", className)}>
            <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                        <h4 className="text-xs font-black uppercase tracking-widest text-blue-700">
                            AI Screening — Transparency Report
                        </h4>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600">
                        EU AI Act Art. 13
                    </Badge>
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Model</span>
                        <p className="font-semibold text-slate-700 mt-0.5">{model}</p>
                    </div>
                    <div>
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Screened</span>
                        <p className="font-semibold text-slate-700 mt-0.5">{formatDateTime(screenedAt)}</p>
                    </div>
                    <div>
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Prompt Hash</span>
                        <p className="font-mono font-semibold text-slate-700 mt-0.5 text-[11px]">{promptHash}</p>
                    </div>
                    <div>
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Score</span>
                        <p className="font-semibold text-slate-700 mt-0.5">{score}/100</p>
                    </div>
                </div>

                {/* Key factors */}
                {factors.length > 0 && (
                    <div>
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Key Factors</span>
                        <div className="mt-1.5 space-y-1.5">
                            {factors.map((f, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                                    <span className="shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-400" />
                                    <span className="flex-1">{f.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Human review status */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-start gap-2">
                        <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <div className="text-xs text-amber-800">
                            <p className="font-bold">Decision support only — not an automated hiring decision</p>
                            <p className="mt-1 text-amber-700">
                                This AI screening is provided as an aid to the recruiter. All hiring decisions
                                must be made by a human. The AI does not have access to protected characteristics
                                (gender, age, ethnicity, disability status).
                            </p>
                            {reviewerName ? (
                                <p className="mt-2 font-semibold">
                                    Reviewed by: {reviewerName}{reviewedAt ? ` — ${formatDateTime(reviewedAt)}` : ""}
                                </p>
                            ) : (
                                <p className="mt-2 font-semibold text-amber-600">
                                    Awaiting human review
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Audit footer */}
                <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1 border-t border-blue-100">
                    <FileText className="h-3 w-3" />
                    <span>This record is retained for regulatory compliance (EU AI Act, Annex IV).</span>
                </div>
            </CardContent>
        </Card>
    );
}
