"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BonusBadge } from "@/components/shared/bonus-badge";
import { formatCurrency, formatDateShort, calculateClientFee, cn } from "@/lib/utils";
import { formatJobLocation } from "@/lib/format-job-location";

type Dict = Record<string, any>;

type TabKey = "live" | "closed" | "filled";


function tabForStatus(status: string): TabKey {
  if (status === "filled") return "filled";
  if (status === "closed" || status === "cancelled") return "closed";
  return "live";
}

export function CompanyJobsTable({ jobs, dict: c }: { jobs: any[]; dict: Dict }) {
  const [tab, setTab] = useState<TabKey>("live");

  function formatGuarantee(months: number | null | undefined) {
    if (months == null) return "—";
    return months <= 1
      ? (c.guaranteeMonths || "{count} month").replace("{count}", String(months))
      : (c.guaranteeMonthsPlural || "{count} months").replace("{count}", String(months));
  }

  function formatSalaryRange(job: any) {
    if (!job.salary_max && !job.salary_min) return "—";
    const currency = job.salary_currency || "EUR";
    return formatCurrency(job.salary_max || job.salary_min, currency);
  }

  function calculateJobFee(job: any) {
    const currency = job.salary_currency || "EUR";
    // Locked fee wins — set on creation/admin override and never recomputed.
    if (job.client_fee_amount != null) {
      return formatCurrency(Number(job.client_fee_amount), currency);
    }
    const baseSalary = job.salary_max || job.salary_min;
    if (!baseSalary) return "—";
    return formatCurrency(
      calculateClientFee(baseSalary, job.guarantee_period_months ?? 0, !!job.is_exclusive),
      currency,
    );
  }

  function getStatusDisplay(status: string) {
    if (status === "active") return { label: c.statusLive || "Live", color: "text-success-500" };
    if (status === "paused") return { label: c.statusPaused || "Paused", color: "text-danger-500" };
    if (status === "draft") return { label: c.statusDraft || "Draft", color: "text-amber-500" };
    if (status === "pending_approval") return { label: c.statusPendingApproval || "Pending Approval", color: "text-sky-500" };
    if (status === "pending_client_reconfirm") return { label: c.statusPendingReconfirm || "Pending Re-confirmation", color: "text-orange-500" };
    if (status === "filled") return { label: c.statusFilled || "Filled", color: "text-emerald-600" };
    if (status === "closed") return { label: c.statusClosed || "Closed", color: "text-slate-500" };
    if (status === "cancelled") return { label: c.statusCancelled || "Cancelled", color: "text-rose-500" };
    return { label: status, color: "text-muted-foreground" };
  }

  const grouped = useMemo(() => {
    const buckets: Record<TabKey, any[]> = { live: [], closed: [], filled: [] };
    for (const job of jobs) {
      buckets[tabForStatus(job.status)].push(job);
    }
    return buckets;
  }, [jobs]);

  const visibleJobs = grouped[tab];

  const tabs: { key: TabKey; label: string }[] = [
    { key: "live", label: `${c.tabLive || "Live"} (${grouped.live.length})` },
    { key: "closed", label: `${c.tabClosed || "Closed"} (${grouped.closed.length})` },
    { key: "filled", label: `${c.tabFilledClosed || "Filled & Closed"} (${grouped.filled.length})` },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "px-6 py-2 rounded-md text-sm font-semibold border transition-colors",
              tab === t.key
                ? "bg-brand-700 text-white border-brand-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visibleJobs.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-border border-dashed">
          <h3 className="text-lg font-medium">{c.noJobsInTab || c.noJobsEmpty}</h3>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold text-foreground">{c.tableTitle || "Job"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">{c.tableCity || "City"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">{c.tableSalary || "Salary"}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{c.tableCandidates}</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">{c.tableFee || "Fee"}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{c.tableGuarantee || "Guarantee"}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{c.tableRecruiters}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{c.tableStatus}</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">{c.tablePublished || "Published"}</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground">{c.tableEdit || "Edit"}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleJobs.map((job: any) => {
                    const { label: statusLabel, color: statusColor } = getStatusDisplay(job.status);
                    return (
                      <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            <Link href={`/company/jobs/${job.id}`} className="hover:text-brand-600 transition-colors">
                              {job.title}
                            </Link>
                            {job.final_interview_bonus && <BonusBadge label={c.bonusBadge || "€100 Bonus"} />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatJobLocation(job) || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatSalaryRange(job)}</td>
                        <td className="px-4 py-3 text-center">{job.candidates_count}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{calculateJobFee(job)}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{formatGuarantee(job.guarantee_period_months)}</td>
                        <td className="px-4 py-3 text-center">{job.recruiters_count}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${statusColor}`}>{statusLabel}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateShort(job.published_at || job.created_at)}</td>
                        <td className="px-4 py-3 text-center">
                          {job.status === "draft" ? (
                            <Link href={`/company/jobs/${job.id}/edit`}>
                              <Button variant="outline" size="sm">{c.tableEdit || "Edit"}</Button>
                            </Link>
                          ) : (
                            <Link href={`/company/jobs/${job.id}`}>
                              <Button variant="outline" size="sm">{c.tableView || "View"}</Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
