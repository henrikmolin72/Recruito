import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { getCandidateScreeningDetail } from "@/lib/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLatestEvaluation } from "@/lib/actions/screening";
import { AdminScreeningPanel } from "@/components/dashboard/admin/run-screening-button";
import { CandidateStageHistoryTimeline } from "@/components/dashboard/company/candidate-stage-history-timeline";
import type { CandidateStageHistory } from "@/types/db-types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    if (value === null || value === undefined || value === "") return null;
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm">{value}</dd>
        </div>
    );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
    return (
        <Card id={id} className="scroll-mt-24">
            <CardContent className="p-5 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
                {children}
            </CardContent>
        </Card>
    );
}

function money(amount: number | null, currency: string | null) {
    if (amount === null || amount === undefined) return null;
    return `${amount.toLocaleString()} ${currency || ""}`.trim();
}

export default async function AdminCandidateDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const c = await getCandidateScreeningDetail(id);
    if (!c) notFound();

    // Latest full AI screening report (admin-scoped read; null if none run yet).
    const report = c.mandate_id ? await getLatestEvaluation(id, c.mandate_id) : null;

    const score: number | null = c.ai_match_score ?? null;

    const screeningAnswers: Array<{ question: string; answer: string }> =
        Array.isArray(c.screening_answers) ? c.screening_answers : [];
    const languages: Array<{ language: string; proficiency: string }> =
        Array.isArray(c.language_proficiency) ? c.language_proficiency : [];

    // Signed CV download URL (admin client; expires in 1h).
    let cvUrl: string | undefined;
    if (c.cv_file_path) {
        try {
            const { data } = await createAdminClient()
                .storage.from("cvs")
                .createSignedUrl(c.cv_file_path, 3600);
            cvUrl = data?.signedUrl;
        } catch {
            // Non-fatal — the page still renders without a download link.
        }
    }

    // Stage-progression audit trail (migration 052), read with the admin client.
    // Recruito is view-only but sees the same client-side history for parity.
    const { data: stageHistoryRows } = await createAdminClient()
        .from("candidate_stage_history")
        .select("*")
        .eq("candidate_id", c.id)
        .order("created_at", { ascending: false });
    const stageHistory: CandidateStageHistory[] = (stageHistoryRows as CandidateStageHistory[]) ?? [];

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                    <Link href="/admin/candidates">
                        <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{c.name}</h1>
                            <StatusBadge status={c.status} />
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {c.current_title || "—"}
                            {c.current_company ? ` @ ${c.current_company}` : ""} · {c.jobTitle} · {c.companyName} · Recruiter: {c.recruiterName}
                        </p>
                    </div>
                </div>
                {cvUrl && (
                    <a href={cvUrl} target="_blank" rel="noreferrer">
                        <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Download CV</Button>
                    </a>
                )}
            </div>

            {c.recruito_rejected_at && c.recruito_reject_reason && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-red-700">Rejected at screening</p>
                    <p className="mt-1 text-sm text-red-800">{c.recruito_reject_reason}</p>
                </div>
            )}

            {/* AI Match — score + full screening report (decision support: reject vs submit) */}
            <Section title="AI Match" id="ai-match">
                {c.mandate_id ? (
                    <AdminScreeningPanel
                        candidateId={c.id}
                        mandateId={c.mandate_id}
                        score={score}
                        initialReport={report}
                    />
                ) : (
                    <>
                        <span className="text-sm text-muted-foreground">
                            {score === null ? "No AI match score yet." : `${score}% — no assignment linked, screening unavailable.`}
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Decision support only — not an automated hiring decision.
                        </p>
                    </>
                )}
            </Section>

            {/* Requirement #1 — screening questions */}
            {screeningAnswers.length > 0 && (
                <Section title="Screening questions">
                    <ul className="space-y-3">
                        {screeningAnswers.map((qa, i) => (
                            <li key={i}>
                                <p className="text-sm font-medium">{qa.question}</p>
                                <p className="mt-0.5 text-sm text-muted-foreground whitespace-pre-wrap">{qa.answer || "—"}</p>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {/* Requirement #1 — recruiter's note */}
            {(c.cover_note || c.assessment_summary) && (
                <Section title="Recruiter's note">
                    {c.assessment_summary && (
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Assessment summary</dt>
                            <dd className="mt-0.5 text-sm whitespace-pre-wrap">{c.assessment_summary}</dd>
                        </div>
                    )}
                    {c.cover_note && (
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cover note</dt>
                            <dd className="mt-0.5 text-sm whitespace-pre-wrap">{c.cover_note}</dd>
                        </div>
                    )}
                </Section>
            )}

            {/* Requirement #1 — salary details */}
            <Section title="Salary & terms">
                <dl className="grid grid-cols-2 gap-4">
                    <Field label="Current salary" value={money(c.current_salary, c.current_salary_currency)} />
                    <Field label="Desired salary" value={money(c.desired_salary, c.desired_salary_currency)} />
                    <Field label="Current benefits" value={c.current_benefits} />
                    <Field label="Desired benefits" value={c.desired_benefits} />
                    <Field label="Reason expected < current" value={c.expected_salary_below_current_reason} />
                    <Field label="Notice period" value={c.notice_period ? `${c.notice_period}${c.notice_negotiable ? " (negotiable)" : ""}` : null} />
                </dl>
            </Section>

            <Section title="Candidate details">
                <dl className="grid grid-cols-2 gap-4">
                    <Field label="Email" value={c.email} />
                    <Field label="Phone" value={c.phone} />
                    <Field label="LinkedIn" value={c.linkedin_url ? <a className="text-brand-600 hover:underline" href={c.linkedin_url} target="_blank" rel="noreferrer">Profile</a> : null} />
                    <Field label="Portfolio" value={c.portfolio_url ? <a className="text-brand-600 hover:underline" href={c.portfolio_url} target="_blank" rel="noreferrer">Link</a> : null} />
                    <Field label="Years of experience" value={c.years_experience} />
                    <Field label="Location" value={[c.location_city, c.location_country].filter(Boolean).join(", ") || null} />
                    <Field label="Location status" value={c.location_status} />
                    <Field label="Work authorization" value={c.work_authorization} />
                    <Field label="Employment status" value={c.employment_status ? `${c.employment_status}${c.employment_status_reason ? ` — ${c.employment_status_reason}` : ""}` : null} />
                    <Field label="Other processes" value={c.other_processes ? `Yes${c.other_processes_stage ? ` — ${c.other_processes_stage}` : ""}` : null} />
                    <Field label="First contact" value={c.first_contact_date} />
                    <Field label="Contact method" value={c.contact_method} />
                    <Field
                        label="Languages"
                        value={languages.length > 0 ? languages.map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`).join(", ") : null}
                    />
                </dl>
            </Section>

            <Section title="Stage history">
                <CandidateStageHistoryTimeline
                    rows={stageHistory}
                    labels={{
                        title: "Stage history",
                        empty: "No stage changes recorded yet.",
                        by: "by {role}",
                        reason: "Reason: {reason}",
                        actions: {
                            move: "Moved",
                            reject: "Rejected",
                            reopen: "Reopened",
                            withdraw: "Withdrawn",
                            hire: "Hired",
                        },
                        stageNames: {
                            viewed: "Viewed",
                            interview: "Interview",
                            final_interview: "Final interview",
                            job_offer: "Job offer",
                            hired: "Hired",
                            rejected: "Rejected",
                            withdrawn: "Withdrawn",
                            offer_accepted: "Offer accepted",
                            recruito_rejected: "Rejected at screening",
                            under_client_review: "Under client review",
                        },
                    }}
                />
            </Section>
        </div>
    );
}
