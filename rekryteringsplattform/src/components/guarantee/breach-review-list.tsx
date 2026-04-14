"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const REASON_LABELS: Record<string, string> = {
    candidate_resigned: "Kandidaten sade upp sig",
    performance: "Ej uppfyllda krav",
    mutual_agreement: "Ömsesidig överenskommelse",
    other: "Annat",
};

interface BreachReport {
    id: string;
    reason: string;
    notes: string | null;
    end_date: string;
    refund_amount: number | null;
    refund_currency: string;
    admin_status: string;
    created_at: string;
    placement: any;
}

interface BreachReviewListProps {
    reports: BreachReport[];
}

async function reviewBreach(reportId: string, action: "approve" | "reject", notes?: string) {
    const res = await fetch("/api/guarantee/breach/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action, notes }),
    });
    return res.json();
}

export function GuaranteeBreachReviewList({ reports }: BreachReviewListProps) {
    const [statuses, setStatuses] = useState<Record<string, string>>(
        Object.fromEntries(reports.map((r) => [r.id, r.admin_status]))
    );
    const [loading, setLoading] = useState<string | null>(null);

    async function handle(reportId: string, action: "approve" | "reject") {
        setLoading(reportId + action);
        const data = await reviewBreach(reportId, action);
        if (data.ok) {
            setStatuses((prev) => ({ ...prev, [reportId]: action === "approve" ? "approved" : "rejected" }));
        }
        setLoading(null);
    }

    return (
        <div className="space-y-3">
            {reports.map((report) => {
                const placement = Array.isArray(report.placement) ? report.placement[0] : report.placement;
                const candidate = Array.isArray(placement?.candidate) ? placement.candidate[0] : placement?.candidate;
                const job = Array.isArray(placement?.job) ? placement.job[0] : placement?.job;
                const company = Array.isArray(placement?.company) ? placement.company[0] : placement?.company;
                const name = candidate ? `${candidate.first_name} ${candidate.last_name}` : "—";
                const status = statuses[report.id];
                const isPending = status === "pending";

                return (
                    <div
                        key={report.id}
                        className={cn(
                            "rounded-xl border p-4 space-y-3",
                            isPending ? "border-amber-200 bg-amber-50/40" :
                            status === "approved" ? "border-success-200 bg-success-50/40" :
                            "border-slate-200 bg-slate-50"
                        )}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                    <p className="font-semibold text-slate-800">{name}</p>
                                    <Badge variant={isPending ? "warning" : status === "approved" ? "success" : "outline"}>
                                        {isPending ? "Väntar" : status === "approved" ? "Godkänd" : "Avvisad"}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {job?.title ?? "—"} · {company?.company_name ?? "—"}
                                </p>
                            </div>
                            {report.refund_amount != null && (
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-slate-800">
                                        {formatCurrency(report.refund_amount, report.refund_currency)}
                                    </p>
                                    <p className="text-[10px] text-slate-400">återbetalning</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                            <div>
                                <span className="font-bold">Orsak:</span> {REASON_LABELS[report.reason] ?? report.reason}
                            </div>
                            <div>
                                <span className="font-bold">Sista dag:</span> {formatDate(report.end_date)}
                            </div>
                            {report.notes && (
                                <div className="col-span-2">
                                    <span className="font-bold">Kommentar:</span> {report.notes}
                                </div>
                            )}
                            <div className="col-span-2 text-slate-400">
                                Rapporterat: {formatDate(report.created_at)}
                            </div>
                        </div>

                        {isPending && (
                            <div className="flex items-center gap-2 pt-1">
                                <Button
                                    size="sm"
                                    onClick={() => handle(report.id, "approve")}
                                    disabled={!!loading}
                                    className="gap-1.5 bg-success-600 hover:bg-success-700"
                                >
                                    {loading === report.id + "approve"
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <CheckCircle className="h-3.5 w-3.5" />}
                                    Godkänn återbetalning
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handle(report.id, "reject")}
                                    disabled={!!loading}
                                    className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                                >
                                    {loading === report.id + "reject"
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <XCircle className="h-3.5 w-3.5" />}
                                    Avvisa
                                </Button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
