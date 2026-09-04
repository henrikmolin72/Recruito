import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowLeft,
    Banknote,
    Building,
    LayoutDashboard,
    FileText,
    Users2,
    Megaphone,
    ShieldCheck,
} from "lucide-react";
import { getAdminJobById, getAdminJobAnnouncements } from "@/lib/actions/admin";
import { getDictionary } from "@/i18n/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { JobPreviewCard } from "@/components/dashboard/shared/job-preview-card";
import { AnnouncementsTab } from "@/components/dashboard/company/announcements-tab";
import { AdminJobPipeline } from "@/components/dashboard/admin/admin-job-pipeline";
import { BiasReportCard } from "@/components/compliance/bias-report-card";
import { formatCurrency } from "@/lib/utils";

export default async function AdminJobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const job = await getAdminJobById(id);
    if (!job) notFound();

    const [announcements, dict] = await Promise.all([getAdminJobAnnouncements(id), getDictionary()]);
    const c = dict.company;

    const recruiterRows = (job.recruiterRows || []) as { recruiter: any; active: boolean }[];
    const activeRecruiterCount = recruiterRows.filter((r) => r.active).length;
    const expiredRecruiterCount = recruiterRows.length - activeRecruiterCount;

    const tabTrigger = "gap-2 px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm";

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-4 flex-wrap">
                <Link href="/admin/jobs">
                    <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-slate-100">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <StatusBadge status={job.status} />
                {job.client_fee_amount != null && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <Banknote className="h-3.5 w-3.5" />
                        Fee: <span className="text-brand-600">{formatCurrency(Number(job.client_fee_amount), job.salary_currency || "EUR")}</span>
                    </span>
                )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">{job.title}</h1>
                {job.company?.company_name && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                        <Building className="h-4 w-4 opacity-50" /> {job.company.company_name}
                    </span>
                )}
            </div>

            <Tabs defaultValue="pipeline" className="space-y-6">
                <TabsList className="bg-slate-100/50 p-1.5 h-12 rounded-xl border border-slate-100">
                    <TabsTrigger value="pipeline" className={tabTrigger}>
                        <LayoutDashboard className="h-4 w-4" /> {c.jobDetailsPipeline}
                    </TabsTrigger>
                    <TabsTrigger value="details" className={tabTrigger}>
                        <FileText className="h-4 w-4" /> {c.jobDetailsDescription}
                    </TabsTrigger>
                    <TabsTrigger value="recruiters" className={tabTrigger}>
                        <Users2 className="h-4 w-4" /> {c.jobDetailsRecruiters}
                    </TabsTrigger>
                    <TabsTrigger value="announcements" className={tabTrigger}>
                        <Megaphone className="h-4 w-4" /> Announcements
                    </TabsTrigger>
                    <TabsTrigger value="ai-compliance" className={tabTrigger}>
                        <ShieldCheck className="h-4 w-4" /> AI Compliance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pipeline" className="mt-0">
                    <AdminJobPipeline candidates={job.candidates || []} />
                </TabsContent>

                <TabsContent value="details" className="mt-0">
                    <JobPreviewCard job={job} variant="company" />
                </TabsContent>

                <TabsContent value="recruiters" className="mt-0">
                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
                        <CardContent className="p-0">
                            <div className="p-6 border-b border-slate-50">
                                <h3 className="text-lg font-bold">
                                    {activeRecruiterCount} {c.activeRecruiters}
                                    {expiredRecruiterCount > 0 && (
                                        <span className="text-slate-400 font-medium"> · {expiredRecruiterCount} {c.recruiterExpired}</span>
                                    )}
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {recruiterRows.length > 0 ? (
                                    recruiterRows.map((row) => (
                                        <div key={row.recruiter.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                                    {(row.recruiter?.profile?.full_name || "R")[0]}
                                                </div>
                                                <div>
                                                    <Link href={`/admin/recruiters/${row.recruiter.id}`} className="font-bold text-slate-900 hover:underline">
                                                        {row.recruiter?.profile?.full_name || dict.common.recruiter}
                                                    </Link>
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
                                                    <p className="text-sm font-bold text-slate-700">⭐ {row.recruiter?.rating || "N/A"}</p>
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
                    <AnnouncementsTab jobId={job.id} initialAnnouncements={announcements} readOnly />
                </TabsContent>

                <TabsContent value="ai-compliance" className="mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <BiasReportCard jobId={job.id} />
                        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                                    <h4 className="text-xs font-black uppercase tracking-widest text-blue-700">EU AI Act Compliance</h4>
                                </div>
                                <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
                                    <p>
                                        All AI screenings for this job are logged with a full audit trail including
                                        model version, prompt hash, and decision context.
                                    </p>
                                    <p>
                                        The AI acts as <span className="font-semibold">decision support only</span> —
                                        all pipeline progression requires human approval.
                                    </p>
                                </div>
                                <div className="pt-2 border-t border-slate-100">
                                    <a href="/ai-policy" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
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
