import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { updateJob } from "@/lib/actions/jobs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDictionary, getLocale } from "@/i18n/server";
import {
    EMPLOYMENT_TYPE_OPTIONS,
    WORK_TYPE_OPTIONS,
    REMOTE_TYPE_OPTIONS,
    SALARY_CURRENCY_OPTIONS,
    SALARY_PERIOD_OPTIONS,
    BENEFITS_OPTIONS,
    POSITION_TYPE_OPTIONS,
    LANGUAGE_LEVEL_OPTIONS,
    INTERVIEW_TYPE_OPTIONS,
    SHIFT_WORK_OPTIONS,
    URGENCY_LEVEL_OPTIONS,
    COUNTRY_OPTIONS,
} from "@/lib/job-form-options";

const BENEFIT_LABELS: Record<string, string> = {
    bonus: "Bonus",
    meal_vouchers: "Friskvårdsbidrag",
    health_insurance: "Sjukförsäkring",
    pension: "Pension",
    profit_sharing: "Vinstdelning",
    stock_options: "Aktieoptioner",
    relocation_package: "Relokationspaket",
};
const WORK_TYPE_LABELS: Record<string, string> = { onsite: "På plats", hybrid: "Hybrid", remote: "Remote" };
const REMOTE_TYPE_LABELS: Record<string, string> = { local: "Lokalt (samma land)", international: "Internationellt" };
const SALARY_PERIOD_LABELS: Record<string, string> = { monthly: "Månad", yearly: "År", hourly: "Timme" };
const LANGUAGE_LEVEL_LABELS: Record<string, string> = { basic: "Grundläggande", intermediate: "Mellan", advanced: "Avancerad", fluent: "Flytande", native: "Modersmål" };
const INTERVIEW_TYPE_LABELS: Record<string, string> = { online: "Online", onsite: "På plats", both: "Båda" };
const SHIFT_WORK_LABELS: Record<string, string> = { no: "Nej", yes: "Ja", rotating: "Roterande" };

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const textareaClass = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const sectionTitle = "text-base font-semibold text-slate-800 pt-4 pb-1 border-t border-slate-100 first:border-0 first:pt-0";

async function getJob(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: job } = await supabase.from("jobs").select("*").eq("id", id).single();
    return job;
}

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const job = await getJob(id);
    if (!job) notFound();

    const dict = await getDictionary();
    const locale = await getLocale();
    const localeCurrencyCode: Record<string, string> = { en: "EUR", sv: "SEK", da: "DKK", no: "NOK" };
    const defaultCurrency = localeCurrencyCode[locale] ?? "EUR";
    const c = dict.company;

    const benefits = (job.benefits as string[] | null) ?? [];
    const screeningQs = (job.screening_questions as string[] | null) ?? [];

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href={`/company/jobs/${id}`}>
                    <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">{c.editJobTitle}</h1>
                    <p className="text-muted-foreground">{c.editJobSubtitle.replace("{title}", job.title)}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{c.jobDetails}</CardTitle>
                    <CardDescription>{c.jobDetailsChangeDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        action={async (formData) => { "use server"; await updateJob(id, formData); }}
                        className="space-y-5"
                    >
                        {/* === BASICS === */}
                        <h3 className={sectionTitle}>Grundläggande</h3>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{c.jobTitleLabel}</label>
                            <Input name="title" defaultValue={job.title} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Land</label>
                                <select name="country" defaultValue={job.country ?? ""} className={selectClass}>
                                    <option value="">Välj land</option>
                                    {COUNTRY_OPTIONS.map(co => <option key={co} value={co}>{co}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Stad</label>
                                <Input name="city" defaultValue={job.city ?? ""} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{c.locationLabel}</label>
                                <Input name="location" defaultValue={job.location} required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{c.industryLabel}</label>
                                <Input name="industry" defaultValue={job.industry} required />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="is_confidential" id="is_confidential" defaultChecked={job.is_confidential ?? false} />
                            <label htmlFor="is_confidential" className="text-sm">Konfidentiellt företag</label>
                        </div>
                        <input type="hidden" name="location_code" defaultValue={job.location_code ?? ""} />

                        {/* === EMPLOYMENT === */}
                        <h3 className={sectionTitle}>Anställning & Arbetsform</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{c.employmentTypeSelectLabel}</label>
                                <select name="employment_type" defaultValue={job.employment_type} className={selectClass}>
                                    {EMPLOYMENT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Kontraktslängd</label>
                                <Input name="contract_duration" defaultValue={job.contract_duration ?? ""} placeholder="t.ex. 6 månader" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Arbetstyp</label>
                                <select name="work_type" defaultValue={job.work_type ?? ""} className={selectClass}>
                                    <option value="">Välj</option>
                                    {WORK_TYPE_OPTIONS.map(w => <option key={w} value={w}>{WORK_TYPE_LABELS[w]}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Remote-typ</label>
                                <select name="remote_type" defaultValue={job.remote_type ?? ""} className={selectClass}>
                                    <option value="">Välj</option>
                                    {REMOTE_TYPE_OPTIONS.map(r => <option key={r} value={r}>{REMOTE_TYPE_LABELS[r]}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" name="work_permit_accepted" id="edit_work_permit" defaultChecked={job.work_permit_accepted ?? false} />
                                <label htmlFor="edit_work_permit" className="text-sm">Accepterar arbetstillstånd</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" name="visa_sponsorship" id="edit_visa" defaultChecked={job.visa_sponsorship ?? false} />
                                <label htmlFor="edit_visa" className="text-sm">Visumsponsorskap</label>
                            </div>
                        </div>

                        {/* === DESCRIPTION & REQUIREMENTS === */}
                        <h3 className={sectionTitle}>Rollbeskrivning & Krav</h3>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{c.roleDescriptionLabel}</label>
                            <textarea name="description" className={textareaClass} defaultValue={job.description} required style={{ minHeight: 120 }} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Teamstruktur</label>
                                <textarea name="team_structure" className={textareaClass} defaultValue={job.team_structure ?? ""} style={{ minHeight: 60 }} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Verktyg / Teknologier</label>
                                <textarea name="tools_technologies" className={textareaClass} defaultValue={job.tools_technologies ?? ""} style={{ minHeight: 60 }} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Typ av position</label>
                                <select name="position_type" defaultValue={job.position_type ?? ""} className={selectClass}>
                                    <option value="">Välj</option>
                                    {POSITION_TYPE_OPTIONS.map(p => <option key={p} value={p}>{p === "new" ? "Ny tjänst" : "Ersättning"}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Antal öppna tjänster</label>
                                <Input type="number" name="open_positions" defaultValue={job.open_positions ?? 1} min="1" max="100" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Min. erfarenhet (år)</label>
                                <Input type="number" name="min_years_experience" defaultValue={job.min_years_experience ?? ""} min="0" max="50" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Krav på utbildning</label>
                                <Input name="required_degree" defaultValue={job.required_degree ?? ""} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Certifieringar</label>
                                <Input name="required_certifications" defaultValue={job.required_certifications ?? ""} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tekniska krav</label>
                            <textarea name="required_technical_skills" className={textareaClass} defaultValue={job.required_technical_skills ?? ""} style={{ minHeight: 60 }} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Branscherfarenhet</label>
                                <Input name="required_industry_experience" defaultValue={job.required_industry_experience ?? ""} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Språkkrav</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input name="required_language" defaultValue={job.required_language ?? ""} placeholder="t.ex. Svenska" />
                                    <select name="required_language_level" defaultValue={job.required_language_level ?? ""} className={selectClass}>
                                        <option value="">Nivå</option>
                                        {LANGUAGE_LEVEL_OPTIONS.map(l => <option key={l} value={l}>{LANGUAGE_LEVEL_LABELS[l]}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* === SALARY & BENEFITS === */}
                        <h3 className={sectionTitle}>Lön & Förmåner</h3>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{c.compensationLabel}</label>
                            <div className="grid grid-cols-4 gap-2">
                                <Input type="number" name="salary_min" defaultValue={job.salary_min ?? ""} placeholder="Från" />
                                <Input type="number" name="salary_max" defaultValue={job.salary_max ?? ""} placeholder="Till" />
                                <select name="salary_currency" defaultValue={job.salary_currency ?? defaultCurrency} className={selectClass}>
                                    {SALARY_CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select name="salary_gross_net" defaultValue={job.salary_gross_net ?? ""} className={selectClass}>
                                    <option value="">Brutto/Netto</option>
                                    <option value="gross">Brutto</option>
                                    <option value="net">Netto</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Löneperiod</label>
                                <select name="salary_period" defaultValue={job.salary_period ?? ""} className={selectClass}>
                                    <option value="">Välj</option>
                                    {SALARY_PERIOD_OPTIONS.map(p => <option key={p} value={p}>{SALARY_PERIOD_LABELS[p]}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bonusstruktur</label>
                                <Input name="bonus_structure" defaultValue={job.bonus_structure ?? ""} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Förmåner</label>
                            <div className="grid grid-cols-2 gap-2">
                                {BENEFITS_OPTIONS.map(b => (
                                    <label key={b} className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" name="benefits" value={b} defaultChecked={benefits.includes(b)} />
                                        {BENEFIT_LABELS[b]}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Övriga förmåner</label>
                            <Input name="benefits_other" defaultValue={job.benefits_other ?? ""} />
                        </div>

                        {/* === RECRUITMENT DETAILS === */}
                        <h3 className={sectionTitle}>Rekryteringsdetaljer</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{c.maxRecruitersLabel}</label>
                                <Input type="number" name="max_recruiters" defaultValue={job.max_recruiters} min="1" max="10" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{c.recruitmentFeeLabel}</label>
                                <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted">
                                    <span className="text-sm font-semibold">{job.fee_percentage}%</span>
                                    <span className="ml-2 text-xs text-muted-foreground">{c.feeSetAtCreation}</span>
                                </div>
                                <input type="hidden" name="fee_percentage" value={job.fee_percentage} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Ansökningsdeadline</label>
                                <Input type="date" name="application_deadline" defaultValue={job.application_deadline ?? ""} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Garantiperiod (max 2 mån)</label>
                                <select name="guarantee_period_months" defaultValue={job.guarantee_period_months ?? ""} className={selectClass}>
                                    <option value="">Välj</option>
                                    <option value="1">1 månad</option>
                                    <option value="2">2 månader</option>
                                </select>
                            </div>
                        </div>

                        {/* === SCREENING & PROCESS === */}
                        <h3 className={sectionTitle}>Screening & Process</h3>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Screeningfrågor</label>
                            <input type="hidden" name="screening_questions" defaultValue={JSON.stringify(screeningQs)} />
                            {screeningQs.length > 0 ? (
                                <div className="space-y-1 text-sm text-slate-600">
                                    {screeningQs.map((q, i) => <p key={i}>{i + 1}. {q}</p>)}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Inga screeningfrågor (redigera via &quot;Skapa jobb&quot;-flödet)</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Intervjutyp</label>
                                <select name="interview_type" defaultValue={job.interview_type ?? ""} className={selectClass}>
                                    <option value="">Välj</option>
                                    {INTERVIEW_TYPE_OPTIONS.map(t => <option key={t} value={t}>{INTERVIEW_TYPE_LABELS[t]}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bedömningstyp</label>
                                <Input name="assessment_type" defaultValue={job.assessment_type ?? ""} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="technical_test_required" id="edit_tech_test" defaultChecked={job.technical_test_required ?? false} />
                            <label htmlFor="edit_tech_test" className="text-sm">Tekniskt test krävs</label>
                        </div>

                        {/* === WORKING CONDITIONS === */}
                        <h3 className={sectionTitle}>Arbetsvillkor & Tidplan</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Arbetstider</label>
                                <Input name="working_hours" defaultValue={job.working_hours ?? ""} placeholder="t.ex. 09:00–18:00" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Skiftarbete</label>
                                <select name="shift_work" defaultValue={job.shift_work ?? ""} className={selectClass}>
                                    <option value="">Välj</option>
                                    {SHIFT_WORK_OPTIONS.map(s => <option key={s} value={s}>{SHIFT_WORK_LABELS[s]}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Skifttider</label>
                                <Input name="shift_timings" defaultValue={job.shift_timings ?? ""} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Övertidspolicy</label>
                                <Input name="overtime_policy" defaultValue={job.overtime_policy ?? ""} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="flexible_hours" id="edit_flex" defaultChecked={job.flexible_hours ?? false} />
                            <label htmlFor="edit_flex" className="text-sm">Flexibla arbetstider</label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Önskat startdatum</label>
                                <Input type="date" name="desired_start_date" defaultValue={job.desired_start_date ?? ""} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Prioritetsnivå</label>
                                <select name="urgency_level" defaultValue={job.urgency_level ?? ""} className={selectClass}>
                                    <option value="">Välj</option>
                                    {URGENCY_LEVEL_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* === OTHER === */}
                        <h3 className={sectionTitle}>Övrigt</h3>
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" name="travel_required" id="edit_travel" defaultChecked={job.travel_required ?? false} />
                                <label htmlFor="edit_travel" className="text-sm">Resor krävs</label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Link href={`/company/jobs/${id}`}>
                                <Button variant="outline" type="button">{dict.common.cancel}</Button>
                            </Link>
                            <Button type="submit">{dict.common.saveChanges}</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
