import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { BonusBadge } from "@/components/shared/bonus-badge";
import {
    ArrowLeft,
    MapPin,
    Building,
    Banknote,
    Clock,
    LayoutDashboard,
    FileText,
    Users2,
    Megaphone,
    ShieldCheck,
} from "lucide-react";
import { formatDate, formatCurrency, calculateClientFee } from "@/lib/utils";
import { formatJobLocation } from "@/lib/format-job-location";
import { FeeReconfirmCard } from "@/components/dashboard/company/fee-reconfirm-card";
import { JobPreviewCard } from "@/components/dashboard/shared/job-preview-card";
import { JobActions } from "@/components/dashboard/company/job-actions";
import { CompanyCandidatesOverview } from "@/components/dashboard/company/company-candidates-overview";
import { getCandidateProfileNoticeAccepted } from "@/lib/actions/company";
import { AnnouncementsTab } from "@/components/dashboard/company/announcements-tab";
import { getDictionary } from "@/i18n/server";
import { getJobAnnouncements } from "@/lib/actions/jobs";
import { BiasReportCard } from "@/components/compliance/bias-report-card";
import { isMandateLiveActive } from "@/lib/mandate-stages";

async function getJob(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: job } = await supabase
        .from("jobs")
        .select(`
      *,
      company:companies(company_name),
      candidates:candidates(
        id,
        first_name,
        last_name,
        current_title,
        status,
        recruito_screened_at,
        current_pipeline_stage,
        recruiter:recruiters(
           headline,
           user_id,
           profile:profiles!recruiters_user_id_fkey(full_name)
        )
      ),
      mandates:job_mandates(
        id,
        is_active,
        claimed_at,
        recruiter:recruiters(
          id,
          user_id,
          headline,
          rating,
          profile:profiles!recruiters_user_id_fkey(full_name)
        )
      )
    `)
        .eq("id", id)
        .single();

    // Visibility gate: the company only sees candidates Recruito has approved.
    if (job && Array.isArray((job as any).candidates)) {
        (job as any).candidates = (job as any).candidates.filter((cand: any) => cand.recruito_screened_at);
    }

    if (job) {
        const admin = createAdminClient();

        // RLS hides recruiter profiles from company users, so the joined
        // profile.full_name comes back null. Fetch display names only via the
        // admin client for recruiters already attached to this job.
        const recruiterUserIds = new Set<string>();
        for (const m of (job as any).mandates || []) {
            if (m.recruiter?.user_id) recruiterUserIds.add(m.recruiter.user_id);
        }
        for (const cand of (job as any).candidates || []) {
            if (cand.recruiter?.user_id) recruiterUserIds.add(cand.recruiter.user_id);
        }
        if (recruiterUserIds.size > 0) {
            const { data: names } = await admin
                .from("profiles")
                .select("id, full_name")
                .in("id", [...recruiterUserIds]);
            const nameById = new Map((names || []).map((n: any) => [n.id, n.full_name]));
            for (const m of (job as any).mandates || []) {
                if (m.recruiter?.user_id && nameById.get(m.recruiter.user_id)) {
                    m.recruiter.profile = { ...(m.recruiter.profile || {}), full_name: nameById.get(m.recruiter.user_id) };
                }
            }
            for (const cand of (job as any).candidates || []) {
                if (cand.recruiter?.user_id && nameById.get(cand.recruiter.user_id)) {
                    cand.recruiter.profile = { ...(cand.recruiter.profile || {}), full_name: nameById.get(cand.recruiter.user_id) };
                }
            }
        }

        // Per-recruiter mandate status for the Recruiters tab. A recruiter can
        // hold several mandate rows on one job (mandate recycling, migration
        // 045): an expired cycle stays as is_active=false history alongside a
        // fresh re-claim. Collapse to one row per recruiter — Active if they
        // currently hold a live mandate, else Expired — using the shared 10-day
        // timer so the company sees the same status the recruiter does, without
        // waiting for the daily expiry cron. Candidate timing is read with the
        // admin client because the company's screened-only candidate RLS would
        // under-count submissions and mistime the expiry.
        const mandates = (job as any).mandates || [];
        if (mandates.length > 0) {
            const { data: cands } = await admin
                .from("candidates")
                .select("recruiter_id, status, status_changed_at")
                .eq("job_id", id);
            const candsByRecruiter = new Map<string, { status: string | null; status_changed_at: string | null }[]>();
            for (const cnd of cands || []) {
                if (!cnd.recruiter_id) continue;
                const arr = candsByRecruiter.get(cnd.recruiter_id) || [];
                arr.push({ status: cnd.status, status_changed_at: cnd.status_changed_at });
                candsByRecruiter.set(cnd.recruiter_id, arr);
            }
            const rowByRecruiter = new Map<string, { recruiter: any; active: boolean }>();
            for (const m of mandates) {
                const rid = m.recruiter?.id;
                if (!rid) continue;
                const liveActive = isMandateLiveActive(
                    { isActive: m.is_active, claimedAt: m.claimed_at ?? null },
                    candsByRecruiter.get(rid) || [],
                );
                const existing = rowByRecruiter.get(rid);
                if (existing) {
                    existing.active = existing.active || liveActive;
                } else {
                    rowByRecruiter.set(rid, { recruiter: m.recruiter, active: liveActive });
                }
            }
            (job as any).recruiterRows = [...rowByRecruiter.values()];
        } else {
            (job as any).recruiterRows = [];
        }
    }

    return job;
}

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const job = await getJob(id);

    if (!job) {
        notFound();
    }

    const announcements = await getJobAnnouncements(id);
    const dict = await getDictionary();
    const c = dict.company;
    const noticeAccepted = await getCandidateProfileNoticeAccepted();

    const recruiterRows = (job as any).recruiterRows || [];
    const activeRecruiterCount = recruiterRows.filter((r: any) => r.active).length;
    const expiredRecruiterCount = recruiterRows.length - activeRecruiterCount;

    return (
        <div className="space-y-8 max-w-6xl mx-auto py-2">
            {/* Breadcrumbs & Actions */}
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between border-b pb-8 border-slate-100">
                <div className="flex items-start gap-5">
                    <Link href="/company/jobs">
                        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-slate-100">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">{job.title}</h1>
                            <StatusBadge status={job.status} />
                            {job.final_interview_bonus && <BonusBadge label={c.bonusBadge || "€100 Bonus"} />}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                            <div className="flex items-center gap-1.5">
                                <Building className="h-4 w-4 opacity-50" />
                                {job.is_confidential ? (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
                                        {c.confidentialBadge || "Confidential"}
                                    </span>
                                ) : (
                                    job.company?.company_name
                                )}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 opacity-50" /> {formatJobLocation(job) || job.location}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4 opacity-50" /> {formatDate(job.created_at)}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <JobActions jobId={job.id} status={job.status} />
                </div>
            </div>

            {job.status === "pending_client_reconfirm" && job.client_fee_amount_proposed != null && job.client_fee_amount_estimated != null && (
                <FeeReconfirmCard
                    jobId={job.id}
                    estimated={Number(job.client_fee_amount_estimated)}
                    proposed={Number(job.client_fee_amount_proposed)}
                    currency={job.salary_currency || "EUR"}
                    reason={job.client_fee_uplift_reason}
                    note={job.client_fee_uplift_note}
                />
            )}

            {/* Main Layout with Tabs */}
            <Tabs defaultValue="pipeline" className="space-y-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <TabsList className="bg-slate-100/50 p-1.5 h-12 rounded-xl border border-slate-100">
                        <TabsTrigger value="pipeline" className="gap-2 px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <LayoutDashboard className="h-4 w-4" /> {c.jobDetailsPipeline}
                        </TabsTrigger>
                        <TabsTrigger value="details" className="gap-2 px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <FileText className="h-4 w-4" /> {c.jobDetailsDescription}
                        </TabsTrigger>
                        <TabsTrigger value="recruiters" className="gap-2 px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Users2 className="h-4 w-4" /> {c.jobDetailsRecruiters}
                        </TabsTrigger>
                        <TabsTrigger value="announcements" className="gap-2 px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Megaphone className="h-4 w-4" /> Announcements
                        </TabsTrigger>
                        <TabsTrigger value="ai-compliance" className="gap-2 px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <ShieldCheck className="h-4 w-4" /> AI Compliance
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                            <Banknote className="h-3.5 w-3.5" />
                            {c.jobDetailsFee}: <span className="text-brand-600">
                                {job.client_fee_amount != null
                                    ? formatCurrency(Number(job.client_fee_amount), job.salary_currency || "EUR")
                                    : (job.salary_max || job.salary_min)
                                        ? formatCurrency(calculateClientFee(job.salary_max || job.salary_min, job.guarantee_period_months ?? 0, !!job.is_exclusive), job.salary_currency || "EUR")
                                        : `${job.fee_percentage}%`}
                            </span>
                        </div>
                        {job.guarantee_period_months != null && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 rounded-lg border border-brand-100 text-brand-700">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {c.jobDetailsGuarantee}: <span>
                                    {(job.guarantee_period_months <= 1 ? c.guaranteeMonths : c.guaranteeMonthsPlural).replace("{count}", String(job.guarantee_period_months))}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <TabsContent value="pipeline" className="mt-0">
                    <div className="space-y-4">
                        <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-slate-700">
                            <span className="font-semibold text-brand-700">Info:</span>{" "}
                            {c.pipelineInfoBanner}
                        </div>
                        <CompanyCandidatesOverview
                            candidates={job.candidates || []}
                            jobId={job.id}
                            noticeAccepted={noticeAccepted}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="details" className="mt-0">
                    <JobPreviewCard job={job} variant="company" hideHeading />
                </TabsContent>

                <TabsContent value="recruiters" className="mt-0">
                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
                        <CardContent className="p-0">
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                                <h3 className="text-lg font-bold">
                                    {activeRecruiterCount} {c.activeRecruiters}
                                    {expiredRecruiterCount > 0 && (
                                        <span className="text-slate-400 font-medium"> · {expiredRecruiterCount} {c.recruiterExpired}</span>
                                    )}
                                </h3>
                            </div>

                            <div className="divide-y divide-slate-50">
                                {recruiterRows.length > 0 ? (
                                    recruiterRows.map((row: any) => (
                                        <div key={row.recruiter.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                                    {(row.recruiter?.profile?.full_name || 'R')[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">
                                                        {row.recruiter?.profile?.full_name || dict.common.recruiter}
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-medium">
                                                        {row.recruiter?.headline || c.professionalRecruiter}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-10">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{c.statusLabel}</p>
                                                    {row.active ? (
                                                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-100">
                                                            {c.recruiterActive}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-100">
                                                            {c.recruiterExpired}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.ratingLabel}</p>
                                                    <p className="text-sm font-bold text-slate-700">⭐ {row.recruiter?.rating || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-12 text-center text-slate-400">
                                        <Users2 className="h-12 w-12 mx-auto mb-4 opacity-10" />
                                        <p className="font-medium">{c.noRecruitersYet}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="announcements" className="mt-0">
                    <AnnouncementsTab jobId={job.id} initialAnnouncements={announcements} />
                </TabsContent>

                <TabsContent value="ai-compliance" className="mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <BiasReportCard jobId={job.id} />
                        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                                    <h4 className="text-xs font-black uppercase tracking-widest text-blue-700">
                                        EU AI Act Compliance
                                    </h4>
                                </div>
                                <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
                                    <p>
                                        All AI screenings for this job are logged with a full audit trail including
                                        model version, prompt hash, and decision context.
                                    </p>
                                    <p>
                                        Each candidate screening includes a transparency report viewable by
                                        recruiters and your company. The AI acts as <span className="font-semibold">decision support only</span> —
                                        all pipeline progression requires human approval.
                                    </p>
                                </div>
                                <div className="pt-2 border-t border-slate-100">
                                    <a href="/company/ai-policy" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                                        View full AI Policy →
                                    </a>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
