import { Briefcase, MapPin, Globe, TrendingUp, Gift, Heart, Shield, Landmark, BarChart2, Package, Car, CheckCircle2, CircleHelp, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TakeMandateButton } from "@/components/dashboard/recruiter/take-mandate-button";
import { sanitizeRichText } from "@/lib/sanitize";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Job } from "@/types/db-types";

// Partial<Job> so callers can pass narrowed SELECT projections (e.g.
// the recruiter detail page omits client_fee_* fields). The component
// already handles missing fields via optional chaining. `company` is
// overridden with a narrower shape because we only render four fields
// from the join.
type JobWithCompany = Omit<Partial<Job>, "company"> & {
    id: string;
    title: string;
    max_recruiters: number;
    current_recruiter_count: number;
    company?: {
        company_name: string;
        website?: string | null;
        logo_url?: string | null;
    } | null;
};

interface JobPreviewCardProps {
    job: JobWithCompany;
    variant: "company" | "recruiter";
    /** Hide "take mandate" CTAs, e.g. when the recruiter already holds the mandate. */
    showMandateCta?: boolean;
    /** Localized label for the "Shift Work" info row. Defaults to English to
     * match the card's other hardcoded labels when no dict is wired in. */
    shiftWorkLabel?: string;
    /** Hide the title/company-name group and city pill, e.g. when the page
     * header above the card already shows them (company Description tab). */
    hideHeading?: boolean;
}

// 1 → "1 Month", 2 → "2 Months" (card labels are hardcoded English by design)
function formatGuaranteeMonths(months: number): string {
    return `${months} Month${months === 1 ? "" : "s"}`;
}

// "full_time" → "Full Time"
function formatEnumLabel(value: string | null | undefined): string | null {
    if (!value) return null;
    return value
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

const BENEFIT_LABELS: Record<string, string> = {
    bonus: "Bonus",
    meal_vouchers: "Wellness allowance",
    health_insurance: "Health insurance",
    pension: "Pension",
    profit_sharing: "Profit sharing",
    stock_options: "Stock options",
    relocation_package: "Relocation package",
    company_car: "Company car",
};

const BENEFIT_ICONS: Record<string, LucideIcon> = {
    bonus: Gift,
    meal_vouchers: Heart,
    health_insurance: Shield,
    pension: Landmark,
    profit_sharing: TrendingUp,
    stock_options: BarChart2,
    relocation_package: Package,
    company_car: Car,
};

export function JobPreviewCard({ job, variant, showMandateCta = true, shiftWorkLabel = "Shift Work", hideHeading = false }: JobPreviewCardProps) {
    const isRecruiter = variant === "recruiter";
    const showCta = isRecruiter && showMandateCta;
    const company = job.company;
    const seatsLeft = job.max_recruiters - job.current_recruiter_count;
    const languages = job.language_requirements ?? [];
    const languageLabel = languages
        .map((l) => `${l.language}${l.level ? ` — ${l.level}` : ""}`)
        .join(", ");

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    {!hideHeading && (
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">{job.title}</h1>
                            <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                                <Briefcase className="h-4 w-4 opacity-60" />
                                <span>{job.is_confidential ? "Confidential" : (company?.company_name ?? "")}</span>
                            </div>
                        </div>
                    )}
                    {isRecruiter && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-w-[180px] text-center space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recruiter Earnings</p>
                            <p className="text-xs text-slate-500">Payout</p>
                            <p className="text-2xl font-black text-slate-800">
                                {job.recruiter_fee_amount
                                    ? formatCurrency(job.recruiter_fee_amount, job.salary_currency ?? "EUR")
                                    : "—"}
                            </p>
                            {job.guarantee_period_months != null && (
                                <p className="text-xs font-semibold text-brand-600">
                                    Guarantee: {formatGuaranteeMonths(job.guarantee_period_months!)}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                    {!hideHeading && job.city && (
                        <span className="flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-slate-600 font-medium">
                            <MapPin className="h-3.5 w-3.5" /> {job.city}{job.country ? `, ${job.country}` : ""}
                        </span>
                    )}
                    {job.work_type && (
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-slate-600 font-medium capitalize">{job.work_type}</span>
                    )}
                    {!isRecruiter && job.guarantee_period_months != null && (
                        <span className="flex items-center gap-1 px-3 py-1 bg-brand-50 rounded-full text-brand-700 font-medium">
                            <Shield className="h-3.5 w-3.5" /> Guarantee: {formatGuaranteeMonths(job.guarantee_period_months!)}
                        </span>
                    )}
                    {!job.is_confidential && company?.website && (
                        <a href={company.website} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-slate-600 font-medium hover:bg-slate-200 transition-colors">
                            <Globe className="h-3.5 w-3.5" /> Website
                        </a>
                    )}
                </div>

                {job.desired_start_date && (
                    <p className="text-sm font-semibold text-brand-600">
                        Desired Start Date: {formatDate(job.desired_start_date)}
                    </p>
                )}

                {showCta && (
                    <div className="flex gap-3 pt-2">
                        <div className={seatsLeft <= 0 ? "opacity-50 pointer-events-none" : ""} title={seatsLeft <= 0 ? "No seats left for recruiters" : undefined}>
                            <TakeMandateButton jobId={job.id} />
                        </div>
                    </div>
                )}
            </div>

            {/* Job Overview grid */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Job Overview</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <OverviewItem label="Employment Type" value={formatEnumLabel(job.employment_type)} />
                    <OverviewItem
                        label="Work Permits"
                        value={job.visa_sponsorship ? "Visa Sponsorship Offered" : job.work_permit_accepted ? "Work Permits Accepted" : null}
                        highlight
                    />
                    <OverviewItem
                        label="Salary"
                        value={(job.salary_max || job.salary_min)
                            ? `${formatCurrency(job.salary_max ?? job.salary_min ?? 0, job.salary_currency ?? "EUR")} / ${job.salary_period ?? "year"}`
                            : null}
                    />
                    <OverviewItem label="Contract" value={formatEnumLabel(job.employment_type)} />
                    <OverviewItem label="Industry" value={job.industry ?? null} />
                    <OverviewItem label="Experience" value={job.experience_bracket} />
                    <OverviewItem
                        label="Language"
                        value={languageLabel || null}
                    />
                    <OverviewItem
                        label="Position"
                        value={job.position_type === "new" ? "New Position" : job.position_type === "replacement" ? "Replacement" : null}
                        highlight={!!job.position_type}
                    />
                    <OverviewItem label="Open Positions" value={job.open_positions ? String(job.open_positions) : null} />
                </div>
            </div>

            {/* Key Requirements + Hiring Process */}
            {((job.key_requirements?.length ?? 0) > 0 || job.num_interviews || job.technical_test_required || job.assessment_type) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(job.key_requirements?.length ?? 0) > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Key Requirements</h2>
                            <ul className="space-y-2.5">
                                {job.key_requirements?.map((req, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                        <CheckCircle2 className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                                        {req}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {(job.num_interviews || job.technical_test_required || job.assessment_type) && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Hiring Process</h2>
                            <div className="space-y-2 text-sm">
                                {job.num_interviews && (
                                    <p className="text-brand-600 font-semibold">Number of Interviews: {job.num_interviews}</p>
                                )}
                                {job.assessment_type && (
                                    <p className="text-brand-600 font-semibold">Assessment: {job.assessment_type}</p>
                                )}
                                {job.technical_test_required && (
                                    <p className="text-brand-600 font-semibold">Technical Test Required: Yes</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Description */}
            {job.description && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Key Responsibilities & Requirements</h2>
                    {/* sanitizeRichText strips all unsafe HTML before rendering — same pattern used throughout the codebase */}
                    <div className="prose max-w-none text-slate-600 leading-relaxed text-sm"
                        dangerouslySetInnerHTML={{ __html: sanitizeRichText(job.description) }} />
                </div>
            )}

            {/* Benefits + Screening Questions */}
            {((job.benefits?.length ?? 0) > 0 || (job.screening_questions?.filter(Boolean).length ?? 0) > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(job.benefits?.length ?? 0) > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Benefits</h2>
                            <ul className="space-y-2.5">
                                {job.benefits!.map((b) => {
                                    const Icon = BENEFIT_ICONS[b] ?? Gift;
                                    return (
                                        <li key={b} className="flex items-center gap-2.5 text-sm text-slate-700">
                                            <Icon className="h-4 w-4 text-brand-400 shrink-0" />
                                            {BENEFIT_LABELS[b] ?? b}
                                        </li>
                                    );
                                })}
                                {job.benefits_other && (
                                    <li className="flex items-center gap-2.5 text-sm text-slate-700">
                                        <Gift className="h-4 w-4 text-brand-400 shrink-0" />
                                        {job.benefits_other}
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    {(job.screening_questions?.filter(Boolean).length ?? 0) > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Screening Questions</h2>
                            <ol className="space-y-2.5 list-none">
                                {job.screening_questions?.filter(Boolean).map((q, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                        <span className="text-brand-500 font-bold shrink-0">{i + 1}.</span>
                                        {q}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            )}

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Additional Information</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                        {job.reporting_to && <InfoItem label="Reports To" value={job.reporting_to} />}
                        {job.working_hours && <InfoItem label="Working Hours" value={job.working_hours} />}
                        {job.shift_work && <InfoItem label={shiftWorkLabel} value={job.shift_work.charAt(0).toUpperCase() + job.shift_work.slice(1)} />}
                        {job.team_size && <InfoItem label="Team Size" value={job.team_size} />}
                        <InfoItem label="Travel Required" value={job.travel_required ? "Yes" : "No"} />
                        <InfoItem label="Flexible Hours" value={job.flexible_hours ? "Yes" : "No"} />
                    </div>
                </div>

                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <CircleHelp className="h-5 w-5 text-brand-500" />
                            <h3 className="font-bold text-slate-700">Need Help?</h3>
                        </div>
                        <p className="text-sm text-slate-500">Our support team is here to help if you have any questions.</p>
                    </div>
                    <a href="mailto:support@recruito.eu"
                        className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                        <Phone className="h-4 w-4" /> Contact Support
                    </a>
                </div>
            </div>
        </div>
    );
}

function OverviewItem({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
    if (!value) return null;
    return (
        <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</p>
            <p className={`text-sm font-semibold ${highlight ? "text-brand-600" : "text-slate-700"}`}>{value}</p>
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold text-slate-700">{value}</p>
        </div>
    );
}
