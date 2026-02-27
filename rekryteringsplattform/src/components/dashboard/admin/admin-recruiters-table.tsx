"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Search, Filter, CheckSquare, Square } from "lucide-react";
import { RecruiterApprovalActions, RecruiterManageActions } from "./recruiter-approval-actions";
import { batchUpdateRecruiters } from "@/lib/actions/admin";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/client";

interface Recruiter {
    id: string;
    user_id: string;
    name: string;
    email: string;
    phone: string;
    headline: string;
    status: string;
    rejection_reason: string;
    rating: number;
    placements: number;
    years_experience: number;
    created_at: string;
}

interface AdminRecruitersTableProps {
    recruiters: Recruiter[];
}

export function AdminRecruitersTable({ recruiters }: AdminRecruitersTableProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [batchLoading, setBatchLoading] = useState(false);
    const router = useRouter();
    const { t } = useTranslations();

    const filtered = recruiters.filter(r => {
        const matchesStatus = statusFilter === "all" || r.status === statusFilter;
        const matchesSearch = !search ||
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.email.toLowerCase().includes(search.toLowerCase()) ||
            r.headline.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(r => r.id)));
        }
    };

    const handleBatchAction = async (action: "approve" | "reject" | "suspend") => {
        if (selectedIds.size === 0) return;
        const confirmMsg = action === "approve"
            ? t("admin.batchConfirmApprove").replace("{count}", String(selectedIds.size))
            : action === "reject"
                ? t("admin.batchConfirmReject").replace("{count}", String(selectedIds.size))
                : t("admin.batchConfirmSuspend").replace("{count}", String(selectedIds.size));

        if (!confirm(confirmMsg)) return;

        setBatchLoading(true);
        const result = await batchUpdateRecruiters(Array.from(selectedIds), action);
        if (result.error) {
            alert(t("common.error") + ": " + result.error);
        }
        setSelectedIds(new Set());
        setBatchLoading(false);
        router.refresh();
    };

    const statuses = ["all", "pending", "approved", "rejected", "suspended"];
    const statusLabels: Record<string, string> = {
        all: t("admin.filterAll"),
        pending: t("admin.statusPending"),
        approved: t("admin.statusApproved"),
        rejected: t("admin.statusRejected"),
        suspended: t("admin.statusSuspended"),
    };

    return (
        <div className="space-y-4">
            {/* Search and filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("admin.searchRecruitersPlaceholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {statuses.map(s => (
                        <Button
                            key={s}
                            size="sm"
                            variant={statusFilter === s ? "default" : "outline"}
                            className="h-9 text-xs"
                            onClick={() => setStatusFilter(s)}
                        >
                            <Filter className="h-3 w-3 mr-1" />
                            {statusLabels[s]}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Batch actions */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 bg-brand-50 rounded-lg px-4 py-2 border border-brand-200">
                    <span className="text-sm font-medium text-brand-700">
                        {t("admin.batchSelectedCount").replace("{count}", String(selectedIds.size))}
                    </span>
                    <div className="flex gap-2 ml-auto">
                        <Button
                            size="sm"
                            className="bg-success-500 hover:bg-success-700 h-7 text-xs"
                            onClick={() => handleBatchAction("approve")}
                            disabled={batchLoading}
                        >
                            {t("admin.approveButton")}
                        </Button>
                        <Button
                            size="sm"
                            variant="danger"
                            className="h-7 text-xs"
                            onClick={() => handleBatchAction("reject")}
                            disabled={batchLoading}
                        >
                            {t("admin.rejectButton")}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleBatchAction("suspend")}
                            disabled={batchLoading}
                        >
                            {t("admin.suspendButton")}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setSelectedIds(new Set())}
                            disabled={batchLoading}
                        >
                            {t("common.clear")}
                        </Button>
                    </div>
                </div>
            )}

            <Card>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th className="p-4 w-10">
                                    <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
                                        {selectedIds.size === filtered.length && filtered.length > 0
                                            ? <CheckSquare className="h-4 w-4" />
                                            : <Square className="h-4 w-4" />
                                        }
                                    </button>
                                </th>
                                <th className="p-4 font-medium text-muted-foreground">{t("admin.tableRecruiter")}</th>
                                <th className="p-4 font-medium text-muted-foreground">{t("admin.tableTitleColumn")}</th>
                                <th className="p-4 font-medium text-muted-foreground">{t("admin.tableStatusColumn")}</th>
                                <th className="p-4 font-medium text-muted-foreground">{t("admin.tablePlacements")}</th>
                                <th className="p-4 font-medium text-muted-foreground">{t("admin.tableRating")}</th>
                                <th className="p-4 font-medium text-muted-foreground">{t("admin.tableActions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{t("admin.noRecruitersRegistered")}</td></tr>
                            ) : (
                                filtered.map((r) => (
                                    <tr key={r.id} className="border-b border-border last:border-0">
                                        <td className="p-4">
                                            <button onClick={() => toggleSelect(r.id)} className="text-muted-foreground hover:text-foreground">
                                                {selectedIds.has(r.id)
                                                    ? <CheckSquare className="h-4 w-4 text-brand-600" />
                                                    : <Square className="h-4 w-4" />
                                                }
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar initials={r.name.split(" ").map((n: string) => n[0]).join("")} size="sm" />
                                                <div>
                                                    <p className="font-medium">{r.name}</p>
                                                    <p className="text-xs text-muted-foreground">{r.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-muted-foreground">{r.headline || t("common.noDataDash")}</td>
                                        <td className="p-4">
                                            <Badge variant={r.status === "approved" ? "success" : r.status === "pending" ? "warning" : "danger"}>
                                                {statusLabels[r.status] || r.status}
                                            </Badge>
                                        </td>
                                        <td className="p-4">{r.placements}</td>
                                        <td className="p-4">
                                            {r.rating > 0 ? (
                                                <div className="flex items-center gap-1">
                                                    <Star className="h-3.5 w-3.5 fill-warning-500 text-warning-500" />
                                                    <span>{r.rating}</span>
                                                </div>
                                            ) : t("common.noDataDash")}
                                        </td>
                                        <td className="p-4">
                                            {r.status === "pending" ? (
                                                <RecruiterApprovalActions recruiterId={r.id} />
                                            ) : (
                                                <RecruiterManageActions recruiterId={r.id} status={r.status} rejectionReason={r.rejection_reason} />
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-right">
                {t("admin.showingCount").replace("{shown}", String(filtered.length)).replace("{total}", String(recruiters.length))}
            </p>
        </div>
    );
}
