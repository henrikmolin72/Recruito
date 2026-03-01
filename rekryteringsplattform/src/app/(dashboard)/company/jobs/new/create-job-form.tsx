"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createJob } from "@/lib/actions/jobs";
import { ArrowLeft, Check, ChevronRight, ChevronLeft, Sparkles, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PipelineBuilder } from "@/components/dashboard/company/pipeline-builder";
import { DEFAULT_PIPELINE_STAGES } from "@/types/enums";
import type { PipelineStage } from "@/types/db-types";
import {
    EMPLOYMENT_TYPE_OPTIONS,
    WORK_TYPE_OPTIONS,
    REMOTE_TYPE_OPTIONS,
    SALARY_GROSS_NET_OPTIONS,
    SALARY_PERIOD_OPTIONS,
    SALARY_CURRENCY_OPTIONS,
    BENEFITS_OPTIONS,
    POSITION_TYPE_OPTIONS,
    LANGUAGE_LEVEL_OPTIONS,
    INTERVIEW_TYPE_OPTIONS,
    SHIFT_WORK_OPTIONS,
    URGENCY_LEVEL_OPTIONS,
    COUNTRY_OPTIONS,
} from "@/lib/job-form-options";

const STEPS = [
    { id: 1, title: "Grunderna", description: "Titel, plats och företagsinfo" },
    { id: 2, title: "Anställning", description: "Typ, arbetsform och tillstånd" },
    { id: 3, title: "Rollen", description: "Beskrivning och krav" },
    { id: 4, title: "Lön & Förmåner", description: "Ersättning och förmåner" },
    { id: 5, title: "Rekrytering", description: "Arvode och process" },
    { id: 6, title: "Screening", description: "Frågor och intervjutyp" },
    { id: 7, title: "Villkor", description: "Arbetstider och tidplan" },
    { id: 8, title: "Övrigt", description: "Resa, bakgrund och pipeline" },
];

const BENEFIT_LABELS: Record<string, string> = {
    bonus: "Bonus",
    meal_vouchers: "Friskvårdsbidrag",
    health_insurance: "Sjukförsäkring",
    pension: "Pension",
    profit_sharing: "Vinstdelning",
    stock_options: "Aktieoptioner",
    relocation_package: "Relokationspaket",
};

const WORK_TYPE_LABELS: Record<string, string> = {
    onsite: "På plats",
    hybrid: "Hybrid",
    remote: "Remote",
};

const REMOTE_TYPE_LABELS: Record<string, string> = {
    local: "Lokalt (samma land)",
    international: "Internationellt",
};

const SALARY_PERIOD_LABELS: Record<string, string> = {
    monthly: "Månad",
    yearly: "År",
    hourly: "Timme",
};

const LANGUAGE_LEVEL_LABELS: Record<string, string> = {
    basic: "Grundläggande",
    intermediate: "Mellan",
    advanced: "Avancerad",
    fluent: "Flytande",
    native: "Modersmål",
};

const INTERVIEW_TYPE_LABELS: Record<string, string> = {
    online: "Online",
    onsite: "På plats",
    both: "Båda",
};

const SHIFT_WORK_LABELS: Record<string, string> = {
    no: "Nej",
    yes: "Ja",
    rotating: "Roterande",
};

const selectClass = "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-all font-medium";
const labelClass = "text-sm font-semibold text-slate-700";
const textareaClass = "flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-all leading-relaxed";
const checkboxClass = "h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500";

interface CreateJobFormProps {
    feePercentage: number;
    tierLabel: string;
}

export function CreateJobForm({ feePercentage, tierLabel }: CreateJobFormProps) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(DEFAULT_PIPELINE_STAGES);
    const [screeningQuestions, setScreeningQuestions] = useState<string[]>([""]);
    const [formData, setFormData] = useState({
        // Step 1
        title: "",
        country: "",
        city: "",
        location_code: "",
        location: "",
        industry: "",
        is_confidential: false,
        // Step 2
        employment_type: "Heltid",
        contract_duration: "",
        work_type: "",
        remote_type: "",
        work_permit_accepted: false,
        visa_sponsorship: false,
        // Step 3
        description: "",
        team_structure: "",
        tools_technologies: "",
        position_type: "",
        open_positions: "1",
        min_years_experience: "",
        required_degree: "",
        required_certifications: "",
        required_technical_skills: "",
        required_industry_experience: "",
        required_language: "",
        required_language_level: "",
        // Step 4
        salary_min: "",
        salary_max: "",
        salary_currency: "SEK",
        salary_gross_net: "",
        salary_period: "",
        bonus_structure: "",
        benefits: [] as string[],
        benefits_other: "",
        // Step 5
        max_recruiters: "5",
        application_deadline: "",
        guarantee_period_months: "",
        recruiter_fee_manual: "",
        // Step 6
        interview_type: "",
        technical_test_required: false,
        assessment_type: "",
        // Step 7
        working_hours: "",
        flexible_hours: false,
        shift_work: "",
        shift_timings: "",
        overtime_policy: "",
        desired_start_date: "",
        urgency_level: "",
        // Step 8
        travel_required: false,
        background_check_required: false,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === "checkbox") {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleBenefitToggle = (benefit: string) => {
        setFormData(prev => ({
            ...prev,
            benefits: prev.benefits.includes(benefit)
                ? prev.benefits.filter(b => b !== benefit)
                : [...prev.benefits, benefit],
        }));
    };

    const addScreeningQuestion = () => {
        if (screeningQuestions.length < 4) {
            setScreeningQuestions(prev => [...prev, ""]);
        }
    };

    const removeScreeningQuestion = (index: number) => {
        setScreeningQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const updateScreeningQuestion = (index: number, value: string) => {
        setScreeningQuestions(prev => prev.map((q, i) => i === index ? value : q));
    };

    const nextStep = () => {
        if (step < 8) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    async function handleSubmit() {
        setLoading(true);
        const data = new FormData();

        // Append all text/number fields
        for (const [key, value] of Object.entries(formData)) {
            if (key === "benefits") continue; // handled separately
            if (typeof value === "boolean") {
                if (value) data.append(key, "on");
            } else {
                data.append(key, String(value));
            }
        }

        // Append benefits array
        for (const b of formData.benefits) {
            data.append("benefits", b);
        }

        // Append screening questions
        const filteredQuestions = screeningQuestions.filter(q => q.trim());
        data.append("screening_questions", JSON.stringify(filteredQuestions));

        // Append pipeline stages
        data.append("pipeline_stages", JSON.stringify(pipelineStages));

        const result = await createJob(data);
        if (result?.error) {
            toast.error(result.error);
            setLoading(false);
        } else {
            toast.success("Jobbet har publicerats!");
            router.push("/company/jobs");
        }
    }

    return (
        <div className="space-y-8 max-w-2xl mx-auto py-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/company/jobs">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Skapa nytt uppdrag</h1>
                        <p className="text-sm text-muted-foreground">Följ stegen för att publicera din rekrytering</p>
                    </div>
                </div>
            </div>

            {/* Step Indicator — compact for 8 steps */}
            <div className="flex items-center justify-between px-1">
                {STEPS.map((s, i) => (
                    <div key={s.id} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1.5">
                            <div className={cn(
                                "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-sm",
                                step >= s.id ? "bg-brand-600 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
                            </div>
                            <span className={cn(
                                "text-[9px] font-bold uppercase tracking-widest text-center leading-tight",
                                step === s.id ? "text-brand-600" : "text-muted-foreground"
                            )}>
                                {s.title}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={cn(
                                "h-[2px] flex-1 mx-2 rounded-full transition-all",
                                step > s.id ? "bg-brand-600" : "bg-muted"
                            )} />
                        )}
                    </div>
                ))}
            </div>

            <Card className="border-none shadow-xl shadow-brand-500/5 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl">{STEPS[step - 1].title}</CardTitle>
                    <CardDescription>{STEPS[step - 1].description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-5"
                        >
                            {/* ===== STEP 1: BASICS ===== */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className={labelClass}>Jobbtitel *</label>
                                        <Input name="title" value={formData.title} onChange={handleInputChange}
                                            placeholder="t.ex. Senior Fullstack Developer"
                                            className="h-12 border-slate-200 focus:border-brand-500 transition-all font-medium" required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Land</label>
                                            <select name="country" value={formData.country} onChange={handleInputChange} className={selectClass}>
                                                <option value="">Välj land</option>
                                                {COUNTRY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>Stad</label>
                                            <Input name="city" value={formData.city} onChange={handleInputChange} placeholder="t.ex. Stockholm" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Plats (fritext) *</label>
                                            <Input name="location" value={formData.location} onChange={handleInputChange}
                                                placeholder="t.ex. Stockholm / Remote" required />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>Bransch *</label>
                                            <Input name="industry" value={formData.industry} onChange={handleInputChange}
                                                placeholder="t.ex. IT & SaaS" required />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pt-1">
                                        <input type="checkbox" name="is_confidential" id="is_confidential"
                                            checked={formData.is_confidential} onChange={handleInputChange} className={checkboxClass} />
                                        <label htmlFor="is_confidential" className="text-sm text-slate-600">Konfidentiellt företag (dölj företagsnamn för rekryterare)</label>
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 2: EMPLOYMENT & WORK TYPE ===== */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Anställningsform *</label>
                                            <select name="employment_type" value={formData.employment_type} onChange={handleInputChange} className={selectClass}>
                                                {EMPLOYMENT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        {(formData.employment_type === "Konsult") && (
                                            <div className="space-y-2">
                                                <label className={labelClass}>Kontraktslängd</label>
                                                <Input name="contract_duration" value={formData.contract_duration} onChange={handleInputChange}
                                                    placeholder="t.ex. 6 månader" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Arbetstyp</label>
                                            <select name="work_type" value={formData.work_type} onChange={handleInputChange} className={selectClass}>
                                                <option value="">Välj arbetstyp</option>
                                                {WORK_TYPE_OPTIONS.map(w => <option key={w} value={w}>{WORK_TYPE_LABELS[w]}</option>)}
                                            </select>
                                        </div>
                                        {formData.work_type === "remote" && (
                                            <div className="space-y-2">
                                                <label className={labelClass}>Remote-typ</label>
                                                <select name="remote_type" value={formData.remote_type} onChange={handleInputChange} className={selectClass}>
                                                    <option value="">Välj</option>
                                                    {REMOTE_TYPE_OPTIONS.map(r => <option key={r} value={r}>{REMOTE_TYPE_LABELS[r]}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-3 pt-2">
                                        <p className={labelClass}>Arbetstillstånd</p>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" name="work_permit_accepted" id="work_permit_accepted"
                                                checked={formData.work_permit_accepted} onChange={handleInputChange} className={checkboxClass} />
                                            <label htmlFor="work_permit_accepted" className="text-sm text-slate-600">Accepterar kandidater som behöver arbetstillstånd</label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" name="visa_sponsorship" id="visa_sponsorship"
                                                checked={formData.visa_sponsorship} onChange={handleInputChange} className={checkboxClass} />
                                            <label htmlFor="visa_sponsorship" className="text-sm text-slate-600">Visumsponsorskap erbjuds</label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 3: DESCRIPTION & REQUIREMENTS ===== */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className={labelClass}>Beskrivning av rollen *</label>
                                        <textarea name="description" value={formData.description} onChange={handleInputChange}
                                            className={cn(textareaClass, "min-h-[160px]")}
                                            placeholder="Berätta om arbetsuppgifter, krav och vad ni erbjuder..." required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Teamstruktur</label>
                                            <textarea name="team_structure" value={formData.team_structure} onChange={handleInputChange}
                                                className={cn(textareaClass, "min-h-[80px]")}
                                                placeholder="Rapporterar till, teamstorlek..." />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>Verktyg / Teknologier</label>
                                            <textarea name="tools_technologies" value={formData.tools_technologies} onChange={handleInputChange}
                                                className={cn(textareaClass, "min-h-[80px]")}
                                                placeholder="t.ex. React, Node.js, AWS..." />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Typ av position</label>
                                            <select name="position_type" value={formData.position_type} onChange={handleInputChange} className={selectClass}>
                                                <option value="">Välj</option>
                                                {POSITION_TYPE_OPTIONS.map(p => (
                                                    <option key={p} value={p}>{p === "new" ? "Ny tjänst" : "Ersättning"}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>Antal öppna tjänster</label>
                                            <Input type="number" name="open_positions" value={formData.open_positions} onChange={handleInputChange}
                                                min="1" max="100" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>Min. erfarenhet (år)</label>
                                            <Input type="number" name="min_years_experience" value={formData.min_years_experience} onChange={handleInputChange}
                                                min="0" max="50" placeholder="t.ex. 3" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Krav på utbildning</label>
                                            <Input name="required_degree" value={formData.required_degree} onChange={handleInputChange}
                                                placeholder="t.ex. Civilingenjör" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>Obligatoriska certifieringar</label>
                                            <Input name="required_certifications" value={formData.required_certifications} onChange={handleInputChange}
                                                placeholder="t.ex. AWS Certified, PMP" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClass}>Tekniska krav</label>
                                        <textarea name="required_technical_skills" value={formData.required_technical_skills} onChange={handleInputChange}
                                            className={cn(textareaClass, "min-h-[60px]")}
                                            placeholder="Lista de viktigaste tekniska kraven..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Branscherfarenhet</label>
                                            <Input name="required_industry_experience" value={formData.required_industry_experience} onChange={handleInputChange}
                                                placeholder="t.ex. Fintech, SaaS" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>Språkkrav</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input name="required_language" value={formData.required_language} onChange={handleInputChange}
                                                    placeholder="t.ex. Svenska" />
                                                <select name="required_language_level" value={formData.required_language_level} onChange={handleInputChange} className={selectClass}>
                                                    <option value="">Nivå</option>
                                                    {LANGUAGE_LEVEL_OPTIONS.map(l => (
                                                        <option key={l} value={l}>{LANGUAGE_LEVEL_LABELS[l]}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 4: SALARY & BENEFITS ===== */}
                            {step === 4 && (
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className={labelClass}>Lön (intervall)</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            <Input type="number" name="salary_min" value={formData.salary_min} onChange={handleInputChange} placeholder="Från" />
                                            <Input type="number" name="salary_max" value={formData.salary_max} onChange={handleInputChange} placeholder="Till" />
                                            <select name="salary_currency" value={formData.salary_currency} onChange={handleInputChange} className={selectClass}>
                                                {SALARY_CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <select name="salary_gross_net" value={formData.salary_gross_net} onChange={handleInputChange} className={selectClass}>
                                                <option value="">Brutto/Netto</option>
                                                <option value="gross">Brutto</option>
                                                <option value="net">Netto</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClass}>Löneperiod</label>
                                        <select name="salary_period" value={formData.salary_period} onChange={handleInputChange} className={selectClass}>
                                            <option value="">Välj period</option>
                                            {SALARY_PERIOD_OPTIONS.map(p => (
                                                <option key={p} value={p}>{SALARY_PERIOD_LABELS[p]}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClass}>Bonusstruktur</label>
                                        <textarea name="bonus_structure" value={formData.bonus_structure} onChange={handleInputChange}
                                            className={cn(textareaClass, "min-h-[60px]")}
                                            placeholder="Beskriv eventuell bonusstruktur..." />
                                    </div>
                                    <div className="space-y-3">
                                        <label className={labelClass}>Förmåner</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {BENEFITS_OPTIONS.map(b => (
                                                <label key={b} className={cn(
                                                    "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-all text-sm",
                                                    formData.benefits.includes(b)
                                                        ? "border-brand-500 bg-brand-50 text-brand-700"
                                                        : "border-slate-200 hover:bg-slate-50"
                                                )}>
                                                    <input type="checkbox" checked={formData.benefits.includes(b)}
                                                        onChange={() => handleBenefitToggle(b)} className={checkboxClass} />
                                                    {BENEFIT_LABELS[b]}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClass}>Övriga förmåner</label>
                                        <Input name="benefits_other" value={formData.benefits_other} onChange={handleInputChange}
                                            placeholder="t.ex. Tjänstebil, extra semester..." />
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 5: RECRUITMENT DETAILS ===== */}
                            {step === 5 && (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Max antal rekryterare *</label>
                                            <Input type="number" name="max_recruiters" value={formData.max_recruiters} onChange={handleInputChange}
                                                min="1" max="10" />
                                            <p className="text-[10px] text-muted-foreground italic">Standard är 5 rekryterare per uppdrag</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>Arvode</label>
                                            <div className="flex items-center h-11 px-4 rounded-xl border border-slate-200 bg-slate-50">
                                                <span className="text-sm font-bold text-brand-600">{feePercentage}%</span>
                                                <span className="ml-2 text-xs text-muted-foreground">({tierLabel})</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground italic">Baseras på ert antal placeringar senaste 12 månader</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Ansökningsdeadline</label>
                                            <Input type="date" name="application_deadline" value={formData.application_deadline} onChange={handleInputChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>Garantiperiod (max 2 mån)</label>
                                            <select name="guarantee_period_months" value={formData.guarantee_period_months} onChange={handleInputChange} className={selectClass}>
                                                <option value="">Välj</option>
                                                <option value="1">1 månad</option>
                                                <option value="2">2 månader</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClass}>Manuellt arvode (EUR, min 2 000)</label>
                                        <Input type="number" name="recruiter_fee_manual" value={formData.recruiter_fee_manual} onChange={handleInputChange}
                                            placeholder="Lämna tomt för automatisk beräkning" min="2000" />
                                        <p className="text-[10px] text-muted-foreground italic">Hanteras av Recruito. Lämna tomt om standardarvode ska gälla.</p>
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 6: SCREENING & HIRING PROCESS ===== */}
                            {step === 6 && (
                                <div className="space-y-5">
                                    <div className="space-y-3">
                                        <label className={labelClass}>Screeningfrågor (max 4)</label>
                                        {screeningQuestions.map((q, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                                                <Input value={q} onChange={(e) => updateScreeningQuestion(i, e.target.value)}
                                                    placeholder={`Fråga ${i + 1}`} className="flex-1" />
                                                {screeningQuestions.length > 1 && (
                                                    <button type="button" onClick={() => removeScreeningQuestion(i)}
                                                        className="text-slate-400 hover:text-danger-500 transition-colors p-1">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {screeningQuestions.length < 4 && (
                                            <button type="button" onClick={addScreeningQuestion}
                                                className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
                                                <Plus className="h-3.5 w-3.5" /> Lägg till fråga
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Intervjutyp</label>
                                            <select name="interview_type" value={formData.interview_type} onChange={handleInputChange} className={selectClass}>
                                                <option value="">Välj</option>
                                                {INTERVIEW_TYPE_OPTIONS.map(t => (
                                                    <option key={t} value={t}>{INTERVIEW_TYPE_LABELS[t]}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>Bedömningstyp</label>
                                            <Input name="assessment_type" value={formData.assessment_type} onChange={handleInputChange}
                                                placeholder="t.ex. Case-studie, kodtest" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" name="technical_test_required" id="technical_test_required"
                                            checked={formData.technical_test_required} onChange={handleInputChange} className={checkboxClass} />
                                        <label htmlFor="technical_test_required" className="text-sm text-slate-600">Tekniskt test krävs</label>
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 7: WORKING CONDITIONS & TIMELINE ===== */}
                            {step === 7 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Arbetstider</label>
                                            <Input name="working_hours" value={formData.working_hours} onChange={handleInputChange}
                                                placeholder="t.ex. 09:00–18:00" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>Skiftarbete</label>
                                            <select name="shift_work" value={formData.shift_work} onChange={handleInputChange} className={selectClass}>
                                                <option value="">Välj</option>
                                                {SHIFT_WORK_OPTIONS.map(s => (
                                                    <option key={s} value={s}>{SHIFT_WORK_LABELS[s]}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    {(formData.shift_work === "yes" || formData.shift_work === "rotating") && (
                                        <div className="space-y-2">
                                            <label className={labelClass}>Skifttider</label>
                                            <Input name="shift_timings" value={formData.shift_timings} onChange={handleInputChange}
                                                placeholder="t.ex. Dag 06–14, Kväll 14–22" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" name="flexible_hours" id="flexible_hours"
                                            checked={formData.flexible_hours} onChange={handleInputChange} className={checkboxClass} />
                                        <label htmlFor="flexible_hours" className="text-sm text-slate-600">Flexibla arbetstider</label>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClass}>Övertidspolicy</label>
                                        <Input name="overtime_policy" value={formData.overtime_policy} onChange={handleInputChange}
                                            placeholder="t.ex. Övertid kompenseras med flextid" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Önskat startdatum</label>
                                            <Input type="date" name="desired_start_date" value={formData.desired_start_date} onChange={handleInputChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>Prioritetsnivå</label>
                                            <select name="urgency_level" value={formData.urgency_level} onChange={handleInputChange} className={selectClass}>
                                                <option value="">Välj</option>
                                                {URGENCY_LEVEL_OPTIONS.map(u => (
                                                    <option key={u.value} value={u.value}>{u.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 8: OTHER + PIPELINE ===== */}
                            {step === 8 && (
                                <div className="space-y-5">
                                    <div className="space-y-3">
                                        <p className={labelClass}>Övrig information</p>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" name="travel_required" id="travel_required"
                                                checked={formData.travel_required} onChange={handleInputChange} className={checkboxClass} />
                                            <label htmlFor="travel_required" className="text-sm text-slate-600">Resor krävs i tjänsten</label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" name="background_check_required" id="background_check_required"
                                                checked={formData.background_check_required} onChange={handleInputChange} className={checkboxClass} />
                                            <label htmlFor="background_check_required" className="text-sm text-slate-600">Bakgrundskontroll krävs</label>
                                        </div>
                                    </div>
                                    <div className="space-y-3 pt-2 border-t border-slate-100">
                                        <label className={labelClass}>Rekryteringsprocess (Pipeline)</label>
                                        <p className="text-sm text-slate-500">
                                            Dra och släpp för att ändra ordning. Lägg till intervjuer och tester efter behov.
                                        </p>
                                        <PipelineBuilder stages={pipelineStages} onChange={setPipelineStages} />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex justify-between items-center pt-8 mt-6 border-t border-slate-100">
                        <Button variant="ghost" onClick={prevStep} disabled={step === 1} className="gap-2">
                            <ChevronLeft className="h-4 w-4" /> Föregående
                        </Button>

                        {step < 8 ? (
                            <Button onClick={nextStep}
                                className="bg-brand-600 hover:bg-brand-700 text-white gap-2 px-6 shadow-md shadow-brand-500/20"
                                disabled={step === 1 && !formData.title}>
                                Nästa steg <ChevronRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={loading}
                                className="bg-success-600 hover:bg-success-700 text-white gap-2 px-8 shadow-md shadow-success-500/20">
                                {loading ? "Publicerar..." : "Slutför och publicera"}
                                <Sparkles className="h-4 w-4 fill-current" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
