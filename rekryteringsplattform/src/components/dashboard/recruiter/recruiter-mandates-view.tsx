"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, UserPlus } from "lucide-react";
import { formatDateShort, cn } from "@/lib/utils";
import { candidateInStage, classifyMandate, mandateExpiryDaysLeft, type MandateStage, type MandateTabKey } from "@/lib/mandate-stages";

// A count badge that links through to the mandate's candidate list, filtered
// to the matching stage.
function CountBadge({ count, colorClass, href }: { count: number; colorClass: string; href: string }) {
    return (
        <Link
            href={href}
            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mx-auto transition-transform hover:scale-110 ${count > 0 ? colorClass : "bg-slate-100 text-slate-400"}`}
        >
            {count}
        </Link>
    );
}

type TabKey = MandateTabKey;

type Dict = Record<string, string>;

interface MandateCandidate {
    status: string;
    status_changed_at?: string | null;
    recruito_screened_at?: string | null;
}

// Days left on the mandate's no-delivery expiry (shared rule: a live candidate
// suspends it; all-rejected restarts it from the last rejection). null = no
// expiry applies.
function mandateExpiryDays(m: Mandate): number | null {
    return mandateExpiryDaysLeft({ claimedAt: m.claimed_at, candidates: m.candidates });
}

interface Mandate {
    id: string;
    title: string;
    company: string;
    location: string | null;
    status: string | null;
    application_deadline: string | null;
    claimed_at: string | null;
    max_candidates: number | null;
    submitted_count: number | null;
    candidates: MandateCandidate[];
}

interface Props {
    mandates: Mandate[];
    dict: Dict;
}

export function RecruiterMandatesView({ mandates, dict: r }: Props) {
    const [tab, setTab] = useState<TabKey>("active");

    const grouped = useMemo(() => {
        const buckets: Record<TabKey, Mandate[]> = { active: [], closed: [], hired: [] };
        for (const m of mandates) {
            buckets[classifyMandate(m)].push(m);
        }
        // Latest mandate (by joined/claimed date) on top within each bucket.
        const byClaimedDesc = (a: Mandate, b: Mandate) =>
            (b.claimed_at ? Date.parse(b.claimed_at) : 0) - (a.claimed_at ? Date.parse(a.claimed_at) : 0);
        for (const key of Object.keys(buckets) as TabKey[]) {
            buckets[key].sort(byClaimedDesc);
        }
        return buckets;
    }, [mandates]);

    const visibleMandates = grouped[tab];

    const tabs: { key: TabKey; label: string; activeClass: string; inactiveClass: string }[] = [
        {
            key: "active",
            label: `${r.tabActive || "Active"} (${grouped.active.length})`,
            activeClass: "bg-brand-700 text-white border-brand-700",
            inactiveClass: "bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent",
        },
        {
            key: "closed",
            label: `${r.tabClosed || "Closed"} (${grouped.closed.length})`,
            activeClass: "bg-pink-300 text-pink-900 border-pink-300",
            inactiveClass: "bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent",
        },
        {
            key: "hired",
            label: `${r.tabHired || "Hired"} (${grouped.hired.length})`,
            activeClass: "bg-emerald-500 text-white border-emerald-500",
            inactiveClass: "bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent",
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{r.mandatesPageTitle}</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => setTab(t.key)}
                        className={cn(
                            "px-6 py-2 rounded-md text-sm font-semibold border transition-colors",
                            tab === t.key ? t.activeClass : t.inactiveClass
                        )}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {visibleMandates.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg border border-border border-dashed">
                    <h3 className="text-lg font-medium">
                        {tab === "closed" ? (r.noClosedMandatesTitle || "No closed mandates")
                            : tab === "hired" ? (r.noHiredMandatesTitle || "No hires yet")
                            : r.noMandatesTitle}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        {tab === "closed" ? (r.noClosedMandatesDesc || "Mandates the client closed or filled will appear here.")
                            : tab === "hired" ? (r.noHiredMandatesDesc || "Mandates where you've made a hire will appear here.")
                            : r.noMandatesDesc}
                    </p>
                    {tab === "active" && (
                        <Link href="/recruiter/jobs">
                            <Button>{r.findJobs}</Button>
                        </Link>
                    )}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="px-4 py-3 text-left font-semibold text-foreground" rowSpan={2}>
                                            {r.tableJobTitle || "Job title"}
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-foreground" rowSpan={2}>
                                            {r.tableCompany || "Company"}
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-foreground" rowSpan={2}>
                                            {r.tableLocation || "Location"}
                                        </th>
                                        <th className="px-4 py-3 text-center font-semibold text-foreground border-l border-border" colSpan={9}>
                                            {r.myCandidates || "My candidates"}
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-foreground border-l border-border" rowSpan={2}>
                                            {r.tableJoined || "Joined"}
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-foreground" rowSpan={2}>
                                            {r.tableExpireIn || "Expire in"}
                                        </th>
                                        <th className="px-4 py-3 text-center font-semibold text-foreground" rowSpan={2}>
                                            {r.tableMessages || "Messages"}
                                        </th>
                                        <th className="px-4 py-3 text-center font-semibold text-foreground" rowSpan={2}>
                                            {r.referCandidate || "Refer a Candidate"}
                                        </th>
                                    </tr>
                                    <tr className="border-b border-border bg-muted/10">
                                        <th className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground border-l border-border">
                                            {(r as any).colDraft || "Draft"}
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
                                            {r.colInReview || "In Review"}
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
                                            {r.colSubmitted || "Submitted"}
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
                                            {r.colInInterview || "In Interview"}
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
                                            {(r as any).colFinalInterview || "Final Interview"}
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
                                            {r.colJobOffer || "Job Offer"}
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
                                            {r.colHired || "Hired"}
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
                                            {r.colRejected || "Rejected"}
                                        </th>
                                        <th className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
                                            {(r as any).colWithdrawn || "Withdrawn"}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleMandates.map((mandate) => {
                                        const draft = mandate.candidates.filter((c) => candidateInStage(c, "draft")).length;
                                        const inReview = mandate.candidates.filter((c) => candidateInStage(c, "in_review")).length;
                                        const submitted = mandate.candidates.filter((c) => candidateInStage(c, "submitted")).length;
                                        const interview = mandate.candidates.filter((c) => candidateInStage(c, "interview")).length;
                                        const finalInterview = mandate.candidates.filter((c) => candidateInStage(c, "final_interview")).length;
                                        const offer = mandate.candidates.filter((c) => candidateInStage(c, "offer")).length;
                                        const hired = mandate.candidates.filter((c) => candidateInStage(c, "hired")).length;
                                        const rejected = mandate.candidates.filter((c) => candidateInStage(c, "rejected")).length;
                                        const withdrawn = mandate.candidates.filter((c) => candidateInStage(c, "withdrawn")).length;
                                        const expiryDays = mandateExpiryDays(mandate);
                                        const stageHref = (stage: MandateStage) => `/recruiter/mandates/${mandate.id}?stage=${stage}#candidates`;

                                        return (
                                            <tr key={mandate.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors align-middle">
                                                <td className="px-4 py-3 min-w-[180px]">
                                                    <Link
                                                        href={`/recruiter/mandates/${mandate.id}`}
                                                        className="font-semibold hover:text-brand-600 transition-colors leading-snug"
                                                    >
                                                        {mandate.title}
                                                    </Link>
                                                </td>

                                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                    {mandate.company}
                                                </td>

                                                <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                                                    {mandate.location || "—"}
                                                </td>

                                                <td className="px-3 py-3 text-center border-l border-border">
                                                    <CountBadge count={draft} colorClass="bg-slate-100 text-slate-700" href={stageHref("draft")} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <CountBadge count={inReview} colorClass="bg-sky-100 text-sky-700" href={stageHref("in_review")} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <CountBadge count={submitted} colorClass="bg-blue-100 text-blue-700" href={stageHref("submitted")} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <CountBadge count={interview} colorClass="bg-purple-100 text-purple-700" href={stageHref("interview")} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <CountBadge count={finalInterview} colorClass="bg-violet-100 text-violet-700" href={stageHref("final_interview")} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <CountBadge count={offer} colorClass="bg-amber-100 text-amber-700" href={stageHref("offer")} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <CountBadge count={hired} colorClass="bg-green-100 text-green-700" href={stageHref("hired")} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <CountBadge count={rejected} colorClass="bg-red-100 text-red-700" href={stageHref("rejected")} />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <CountBadge count={withdrawn} colorClass="bg-zinc-100 text-zinc-600" href={stageHref("withdrawn")} />
                                                </td>

                                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap border-l border-border">
                                                    {mandate.claimed_at ? formatDateShort(mandate.claimed_at) : "—"}
                                                </td>

                                                <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                    {expiryDays === null ? (
                                                        <span className="text-muted-foreground">—</span>
                                                    ) : expiryDays <= 0 ? (
                                                        <span className="text-danger-500 font-semibold">{r.expiredLabel || "Expired"}</span>
                                                    ) : expiryDays <= 3 ? (
                                                        <span className="text-amber-600 font-semibold">{expiryDays}d</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">{expiryDays}d</span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 text-center">
                                                    <Link
                                                        href="/recruiter/messages"
                                                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                                    >
                                                        <MessageSquare className="h-4 w-4" />
                                                    </Link>
                                                </td>

                                                <td className="px-4 py-3 text-center">
                                                    {(() => {
                                                        const isExpired = expiryDays !== null && expiryDays <= 0;
                                                        const isPaused = mandate.status === "paused";
                                                        const cap = mandate.max_candidates ?? 8;
                                                        const totalSubmitted = mandate.submitted_count ?? 0;
                                                        const capReached = totalSubmitted >= cap;
                                                        const blocked = isExpired || isPaused || capReached || tab !== "active";

                                                        if (blocked) {
                                                            return (
                                                                <Button
                                                                    size="sm"
                                                                    disabled
                                                                    className="gap-1.5 whitespace-nowrap text-xs opacity-60 cursor-not-allowed"
                                                                >
                                                                    <UserPlus className="h-3.5 w-3.5" />
                                                                    {isExpired
                                                                        ? (r.expiredLabel || "Expired")
                                                                        : isPaused
                                                                            ? (r.pausedLabel || "Paused")
                                                                            : capReached
                                                                                ? (r.capReachedLabel || "Cap reached")
                                                                                : (r.referCandidate || "Refer a Candidate")}
                                                                </Button>
                                                            );
                                                        }

                                                        return (
                                                            <Link href={`/recruiter/mandates/${mandate.id}/candidates/new`}>
                                                                <Button
                                                                    size="sm"
                                                                    className="gap-1.5 bg-brand-600 hover:bg-brand-700 text-white whitespace-nowrap text-xs"
                                                                >
                                                                    <UserPlus className="h-3.5 w-3.5" />
                                                                    {r.referCandidate || "Refer a Candidate"}
                                                                </Button>
                                                            </Link>
                                                        );
                                                    })()}
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
