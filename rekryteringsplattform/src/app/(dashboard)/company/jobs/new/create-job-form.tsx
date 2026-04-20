"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createJob, deleteDraftJob } from "@/lib/actions/jobs";
import { ArrowLeft, Check, ChevronRight, ChevronLeft, Sparkles, Plus, X, ExternalLink, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { RecruitmentCalculator, CALCULATOR_DEFAULTS, type CalculatorState } from "@/components/layout/recruitment-calculator";
import { DEFAULT_PIPELINE_STAGES } from "@/types/enums";
import type { PipelineStage } from "@/types/db-types";
import { useTranslations } from "@/i18n/client";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
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
    SHIFT_WORK_OPTIONS,
    URGENCY_LEVEL_OPTIONS,
    COUNTRY_OPTIONS,
    EUROPEAN_LANGUAGE_OPTIONS,
    INDUSTRY_OPTIONS,
} from "@/lib/job-form-options";

const selectClass = "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-all font-medium";
const labelClass = "text-sm font-semibold text-slate-700";
const textareaClass = "flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-all leading-relaxed";
const checkboxClass = "h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500";

interface InitialJobData {
    title?: string;
    country?: string;
    city?: string;
    location_code?: string;
    location?: string;
    industry?: string;
    is_confidential?: boolean;
    employment_type?: string;
    contract_duration?: string;
    work_type?: string;
    remote_type?: string;
    work_permit_accepted?: boolean;
    visa_sponsorship?: boolean;
    description?: string;
    management_required?: boolean;
    team_size?: number | string | null;
    reporting_to?: string;
    position_type?: string;
    open_positions?: number | string | null;
    salary_min?: number | string | null;
    salary_currency?: string;
    salary_gross_net?: string;
    salary_period?: string;
    bonus_structure?: string;
    benefits?: string[];
    benefits_other?: string;
    application_deadline?: string;
    guarantee_period_months?: number | string | null;
    num_interviews?: number | string | null;
    interview_conductors?: string;
    technical_test_required?: boolean;
    assessment_type?: string;
    working_hours?: string;
    flexible_hours?: boolean;
    shift_work?: string;
    shift_timings?: string;
    overtime_policy?: string;
    desired_start_date?: string;
    urgency_level?: string;
    travel_required?: boolean;
    background_check_required?: boolean;
    screening_questions?: string[];
    key_requirements?: string[];
    language_requirements?: Array<{ language: string; level: string }>;
}

interface CreateJobFormProps {
    feePercentage: number;
    tierLabel: string;
    editJobId?: string;
    initialData?: InitialJobData;
}

interface LanguageRequirement {
    language: string;
    level: string;
}

export function CreateJobForm({ feePercentage, editJobId, initialData }: CreateJobFormProps) {
    const router = useRouter();
    const { t } = useTranslations();
    const isEditing = Boolean(editJobId);
    const [step, setStep] = useState(1);
    const [maxStepReached, setMaxStepReached] = useState(isEditing ? 7 : 1);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
    const pipelineStages = DEFAULT_PIPELINE_STAGES;
    const [screeningQuestions, setScreeningQuestions] = useState<string[]>(
        initialData?.screening_questions?.length ? initialData.screening_questions : [""]
    );
    const [keyRequirements, setKeyRequirements] = useState<string[]>(
        initialData?.key_requirements?.length ? initialData.key_requirements : [""]
    );
    const [languageRequirements, setLanguageRequirements] = useState<LanguageRequirement[]>(
        initialData?.language_requirements ?? []
    );
    const [draftJobId, setDraftJobId] = useState<string | null>(editJobId ?? null);
    const [calcState, setCalcState] = useState<CalculatorState>({
        ...CALCULATOR_DEFAULTS,
        salary: initialData?.salary_min ? Number(initialData.salary_min) : CALCULATOR_DEFAULTS.salary,
        currency: initialData?.salary_currency ?? CALCULATOR_DEFAULTS.currency,
    });

    const STEPS = [
        { id: 1, title: t("jobForm.step1Title"), description: t("jobForm.step1Desc") },
        { id: 2, title: t("jobForm.step2Title"), description: t("jobForm.step2Desc") },
        { id: 3, title: t("jobForm.step3Title"), description: t("jobForm.step3Desc") },
        { id: 4, title: t("jobForm.step4Title"), description: t("jobForm.step4Desc") },
        { id: 5, title: t("jobForm.step5Title"), description: t("jobForm.step5Desc") },
        { id: 6, title: t("jobForm.step6Title"), description: t("jobForm.step6Desc") },
        { id: 7, title: t("jobForm.step7Title"), description: t("jobForm.step7Desc") },
    ];

    const recruitmentFee = useMemo(() => {
        const commission = 0.11 + calcState.guaranteeMonths * 0.01;
        const discount = calcState.isExclusive ? 0.10 : 0;
        return Math.max(calcState.salary * commission * (1 - discount), 3500);
    }, [calcState]);

    const BENEFIT_LABELS: Record<string, string> = {
        bonus: t("jobForm.benefitBonus"),
        meal_vouchers: t("jobForm.benefitMealVouchers"),
        health_insurance: t("jobForm.benefitHealthInsurance"),
        pension: t("jobForm.benefitPension"),
        profit_sharing: t("jobForm.benefitProfitSharing"),
        stock_options: t("jobForm.benefitStockOptions"),
        relocation_package: t("jobForm.benefitRelocation"),
        company_car: t("jobForm.benefitCompanyCar"),
    };

    const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
        full_time: t("jobForm.empFullTime"),
        part_time: t("jobForm.empPartTime"),
        consultant: t("jobForm.empConsultant"),
        freelance: t("jobForm.empFreelance"),
        internship: t("jobForm.empInternship"),
    };

    const WORK_TYPE_LABELS: Record<string, string> = {
        onsite: t("jobForm.workTypeOnsite"),
        hybrid: t("jobForm.workTypeHybrid"),
        remote: t("jobForm.workTypeRemote"),
    };

    const REMOTE_TYPE_LABELS: Record<string, string> = {
        local: t("jobForm.remoteLocal"),
        international: t("jobForm.remoteInternational"),
    };

    const SALARY_PERIOD_LABELS: Record<string, string> = {
        monthly: t("jobForm.periodMonthly"),
        yearly: t("jobForm.periodYearly"),
        hourly: t("jobForm.periodHourly"),
    };

    const LANGUAGE_LEVEL_LABELS: Record<string, string> = {
        basic: t("jobForm.levelBasic"),
        intermediate: t("jobForm.levelIntermediate"),
        advanced: t("jobForm.levelAdvanced"),
        fluent: t("jobForm.levelFluent"),
        native: t("jobForm.levelNative"),
    };

    const SHIFT_WORK_LABELS: Record<string, string> = {
        no: t("jobForm.shiftNo"),
        yes: t("jobForm.shiftYes"),
        rotating: t("jobForm.shiftRotating"),
    };

    const [formData, setFormData] = useState({
        // Step 1
        title: initialData?.title ?? "",
        country: initialData?.country ?? "",
        city: initialData?.city ?? "",
        location_code: initialData?.location_code ?? "",
        location: initialData?.location ?? "",
        industry: initialData?.industry ?? "",
        is_confidential: initialData?.is_confidential ?? false,
        // Step 2
        employment_type: initialData?.employment_type ?? "full_time",
        contract_duration: initialData?.contract_duration ?? "",
        work_type: initialData?.work_type ?? "",
        remote_type: initialData?.remote_type ?? "",
        work_permit_accepted: initialData?.work_permit_accepted ?? false,
        visa_sponsorship: initialData?.visa_sponsorship ?? false,
        // Step 3
        description: initialData?.description ?? "",
        management_required: initialData?.management_required ?? false,
        team_size: initialData?.team_size != null ? String(initialData.team_size) : "",
        reporting_to: initialData?.reporting_to ?? "",
        position_type: initialData?.position_type ?? "",
        open_positions: initialData?.open_positions != null ? String(initialData.open_positions) : "1",
        // Step 4
        salary_min: "",
        salary_max: "",
        salary_currency: initialData?.salary_currency ?? "SEK",
        salary_gross_net: initialData?.salary_gross_net ?? "",
        salary_period: initialData?.salary_period ?? "",
        bonus_structure: initialData?.bonus_structure ?? "",
        benefits: initialData?.benefits ?? [] as string[],
        benefits_other: initialData?.benefits_other ?? "",
        // Step 5
        application_deadline: initialData?.application_deadline ?? "",
        guarantee_period_months: initialData?.guarantee_period_months != null ? String(initialData.guarantee_period_months) : "",
        // Step 6
        num_interviews: initialData?.num_interviews != null ? String(initialData.num_interviews) : "",
        interview_conductors: initialData?.interview_conductors ?? "",
        technical_test_required: initialData?.technical_test_required ?? false,
        assessment_type: initialData?.assessment_type ?? "",
        // Step 7
        working_hours: initialData?.working_hours ?? "",
        flexible_hours: initialData?.flexible_hours ?? false,
        shift_work: initialData?.shift_work ?? "",
        shift_timings: initialData?.shift_timings ?? "",
        overtime_policy: initialData?.overtime_policy ?? "",
        desired_start_date: initialData?.desired_start_date ?? "",
        urgency_level: initialData?.urgency_level ?? "",
        // Step 8
        travel_required: initialData?.travel_required ?? false,
        background_check_required: initialData?.background_check_required ?? false,
    });

    // Publish only when all required fields are filled and declaration confirmed
    const canPublish = Boolean(
        formData.title.trim() &&
        formData.location.trim() &&
        formData.industry.trim() &&
        formData.employment_type.trim() &&
        formData.description.trim() &&
        maxStepReached >= 6 &&
        declarationConfirmed
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === "checkbox") {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            // Ensure text fields never become null - always use empty string for empty values
            const normalizedValue = value === null ? "" : value;
            setFormData(prev => ({ ...prev, [name]: normalizedValue }));
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

    // Screening questions
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

    // Key requirements
    const addKeyRequirement = () => {
        if (keyRequirements.length < 5) {
            setKeyRequirements(prev => [...prev, ""]);
        }
    };
    const removeKeyRequirement = (index: number) => {
        setKeyRequirements(prev => prev.filter((_, i) => i !== index));
    };
    const updateKeyRequirement = (index: number, value: string) => {
        setKeyRequirements(prev => prev.map((r, i) => i === index ? value : r));
    };

    // Language requirements
    const addLanguageRequirement = () => {
        if (languageRequirements.length < 3) {
            setLanguageRequirements(prev => [...prev, { language: "", level: "" }]);
        }
    };
    const removeLanguageRequirement = (index: number) => {
        setLanguageRequirements(prev => prev.filter((_, i) => i !== index));
    };
    const updateLanguageRequirement = (index: number, field: keyof LanguageRequirement, value: string) => {
        setLanguageRequirements(prev => prev.map((lr, i) => i === index ? { ...lr, [field]: value } : lr));
    };

    const goToStep = (targetStep: number) => {
        setStep(targetStep);
        setMaxStepReached(prev => Math.max(prev, targetStep));
    };

    const nextStep = () => {
        if (step < 7) {
            const next = step + 1;
            setStep(next);
            setMaxStepReached(prev => Math.max(prev, next));
        }
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    function buildFormData(isDraft = false) {
        // Auto-populate location from city + country if empty
        const finalData = { ...formData };
        if (!finalData.location.trim() && finalData.city.trim()) {
            finalData.location = finalData.country
                ? `${finalData.city}, ${finalData.country}`
                : finalData.city;
        }

        const data = new FormData();

        // Append all text/number fields
        for (const [key, value] of Object.entries(finalData)) {
            if (key === "benefits") continue;
            if (typeof value === "boolean") {
                if (value) data.append(key, "on");
            } else {
                // Ensure null/undefined are converted to empty strings, not "null"/"undefined"
                const stringValue = value === null || value === undefined ? "" : String(value);
                data.append(key, stringValue);
            }
        }
        // Override salary and currency with values from the calculator
        data.set("salary_min", String(calcState.salary));
        data.set("salary_max", String(calcState.salary));
        data.set("salary_currency", calcState.currency);

        if (isDraft) {
            data.append("status", "draft");
        }
        return data;
    }

    async function handleSaveDraft() {
        setLoading(true);
        const data = buildFormData(true);

        // If we already saved a draft, pass its ID so it gets updated instead of creating a new one
        if (draftJobId) {
            data.append("draft_id", draftJobId);
        }

        // Append arrays
        for (const b of formData.benefits) {
            data.append("benefits", b);
        }
        data.append("screening_questions", JSON.stringify(screeningQuestions.filter(q => q.trim())));
        data.append("key_requirements", JSON.stringify(keyRequirements.filter(r => r.trim())));
        data.append("language_requirements", JSON.stringify(languageRequirements.filter(lr => lr.language && lr.level)));
        data.append("pipeline_stages", JSON.stringify(pipelineStages));
        data.append("fee_percentage", String(feePercentage));
        data.append("max_recruiters", "5");

        const result = await createJob(data);
        if (result?.error) {
            toast.error(typeof result.error === "string" ? result.error : "Kunde inte spara utkast");
        } else {
            if (result?.jobId) {
                setDraftJobId(result.jobId);
            }
            toast.success(t("jobForm.draftSaved") || "Utkast sparat!");
        }
        setLoading(false);
    }

    async function handleSubmit() {
        if (!canPublish) {
            if (!declarationConfirmed) {
                toast.error(t("jobForm.declarationRequired") || "You must confirm the declaration to submit.");
            } else {
                toast.error(t("jobForm.fillAllRequired") || "Please fill all required fields before publishing.");
            }
            return;
        }
        setLoading(true);
        const data = buildFormData();

        // If this was saved as a draft before, update it instead of creating a new job
        if (draftJobId) {
            data.append("draft_id", draftJobId);
        }

        // Hidden defaults for internal fields not shown in form
        data.append("fee_percentage", String(feePercentage));
        data.append("max_recruiters", "5");

        // Append benefits array
        for (const b of formData.benefits) {
            data.append("benefits", b);
        }

        // Append screening questions
        const filteredQuestions = screeningQuestions.filter(q => q.trim());
        data.append("screening_questions", JSON.stringify(filteredQuestions));

        // Append key requirements
        const filteredRequirements = keyRequirements.filter(r => r.trim());
        data.append("key_requirements", JSON.stringify(filteredRequirements));

        // Append language requirements
        const filteredLanguages = languageRequirements.filter(lr => lr.language && lr.level);
        data.append("language_requirements", JSON.stringify(filteredLanguages));

        // Append pipeline stages
        data.append("pipeline_stages", JSON.stringify(pipelineStages));

        const result = await createJob(data);
        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success(t("jobForm.jobPublished"));
            router.push("/company/jobs");
        }
        setLoading(false);
    }

    async function handleDeleteDraft() {
        if (!editJobId) return;
        setDeleting(true);
        try {
            const result = await deleteDraftJob(editJobId);
            if (result?.error) {
                toast.error(result.error);
                setDeleting(false);
                setConfirmDelete(false);
            } else {
                toast.success(t("jobForm.deleteDraftSuccess"));
                window.location.href = "/company/jobs";
            }
        } catch (err: any) {
            toast.error(err?.message || "Delete failed");
            setDeleting(false);
            setConfirmDelete(false);
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
                        <h1 className="text-2xl font-bold tracking-tight">{isEditing ? t("jobForm.editTitle") : t("jobForm.createTitle")}</h1>
                        <p className="text-sm text-muted-foreground">{t("jobForm.createSubtitle")}</p>
                    </div>
                </div>
                {isEditing && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete(true)}
                        disabled={deleting}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        {t("jobForm.deleteDraft")}
                    </Button>
                )}
                {confirmDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40" onClick={() => !deleting && setConfirmDelete(false)} />
                        <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                            <h2 className="text-lg font-bold text-slate-900 mb-2">{t("jobForm.deleteDraft")}</h2>
                            <p className="text-sm text-slate-500 mb-6">{t("jobForm.deleteDraftConfirm")}</p>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
                                <Button variant="danger" onClick={handleDeleteDraft} disabled={deleting} className="gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    {deleting ? "Deleting…" : t("jobForm.deleteDraft")}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Step Indicator — clickable for navigation */}
            <div className="flex items-center justify-between px-1">
                {STEPS.map((s, i) => (
                    <div key={s.id} className="flex items-center flex-1 last:flex-none">
                        <button
                            type="button"
                            onClick={() => goToStep(s.id)}
                            className="flex flex-col items-center gap-1.5 cursor-pointer group"
                        >
                            <div className={cn(
                                "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-sm group-hover:ring-2 group-hover:ring-brand-300",
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
                        </button>
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
                    {step >= 2 && (
                        <span className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                            Recruitment Fee {Math.round(recruitmentFee).toLocaleString("sv-SE")} {calcState.currency}
                        </span>
                    )}
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
                                        <label className={labelClass}>{t("jobForm.jobTitle")} *</label>
                                        <Input name="title" value={formData.title} onChange={handleInputChange}
                                            placeholder={t("jobForm.jobTitlePlaceholder")}
                                            className="h-12 border-slate-200 focus:border-brand-500 transition-all font-medium" required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.country")}</label>
                                            <select name="country" value={formData.country} onChange={handleInputChange} className={selectClass}>
                                                <option value="">{t("jobForm.selectCountry")}</option>
                                                {COUNTRY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.city")}</label>
                                            <Input name="city" value={formData.city} onChange={handleInputChange} placeholder={t("jobForm.cityPlaceholder")} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.locationFreeText")} *</label>
                                            <Input name="location" value={formData.location} onChange={handleInputChange}
                                                placeholder={t("jobForm.locationPlaceholder")} required />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.industry")} *</label>
                                            <select name="industry" value={formData.industry} onChange={handleInputChange}
                                                className={selectClass} required>
                                                <option value="">{t("jobForm.industryPlaceholder")}</option>
                                                {INDUSTRY_OPTIONS.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pt-1">
                                        <input type="checkbox" name="is_confidential" id="is_confidential"
                                            checked={formData.is_confidential} onChange={handleInputChange} className={checkboxClass} />
                                        <label htmlFor="is_confidential" className="text-sm text-slate-600">{t("jobForm.confidential")}</label>
                                    </div>

                                    {/* Recruitment Fee Calculator */}
                                    <div className="pt-4 mt-4 border-t border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-700 mb-3">{t("jobForm.calculatorTitle") || "Calculator"}</h3>
                                        <RecruitmentCalculator state={calcState} onStateChange={setCalcState} />
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 2: EMPLOYMENT & WORK TYPE ===== */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.employmentType")} *</label>
                                            <select name="employment_type" value={formData.employment_type} onChange={handleInputChange} className={selectClass}>
                                                {EMPLOYMENT_TYPE_OPTIONS.map(et => <option key={et} value={et}>{EMPLOYMENT_TYPE_LABELS[et]}</option>)}
                                            </select>
                                        </div>
                                        {(formData.employment_type === "consultant") && (
                                            <div className="space-y-2">
                                                <label className={labelClass}>{t("jobForm.contractDuration")}</label>
                                                <Input name="contract_duration" value={formData.contract_duration} onChange={handleInputChange}
                                                    placeholder={t("jobForm.contractPlaceholder")} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.workType")}</label>
                                            <select name="work_type" value={formData.work_type} onChange={handleInputChange} className={selectClass}>
                                                <option value="">{t("jobForm.selectWorkType")}</option>
                                                {WORK_TYPE_OPTIONS.map(w => <option key={w} value={w}>{WORK_TYPE_LABELS[w]}</option>)}
                                            </select>
                                        </div>
                                        {formData.work_type === "remote" && (
                                            <div className="space-y-2">
                                                <label className={labelClass}>{t("jobForm.remoteType")}</label>
                                                <select name="remote_type" value={formData.remote_type} onChange={handleInputChange} className={selectClass}>
                                                    <option value="">{t("jobForm.selectRemoteType")}</option>
                                                    {REMOTE_TYPE_OPTIONS.map(r => <option key={r} value={r}>{REMOTE_TYPE_LABELS[r]}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-3 pt-2">
                                        <p className={labelClass}>{t("jobForm.workPermits")}</p>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" name="work_permit_accepted" id="work_permit_accepted"
                                                checked={formData.work_permit_accepted} onChange={handleInputChange} className={checkboxClass} />
                                            <label htmlFor="work_permit_accepted" className="text-sm text-slate-600">{t("jobForm.acceptWorkPermit")}</label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" name="visa_sponsorship" id="visa_sponsorship"
                                                checked={formData.visa_sponsorship} onChange={handleInputChange} className={checkboxClass} />
                                            <label htmlFor="visa_sponsorship" className="text-sm text-slate-600">{t("jobForm.visaSponsorship")}</label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 3: DESCRIPTION & REQUIREMENTS ===== */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    {/* Key Requirements — shown first */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className={labelClass}>{t("jobForm.keyRequirements")}</label>
                                            <p className="text-xs text-muted-foreground mt-0.5">{t("jobForm.keyRequirementsHelp")}</p>
                                        </div>
                                        {keyRequirements.map((r, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                                                <Input value={r} onChange={(e) => updateKeyRequirement(i, e.target.value)}
                                                    placeholder={`${t("jobForm.keyRequirementPlaceholder")} ${i + 1}`} className="flex-1" />
                                                {keyRequirements.length > 1 && (
                                                    <button type="button" onClick={() => removeKeyRequirement(i)}
                                                        className="text-slate-400 hover:text-danger-500 transition-colors p-1">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {keyRequirements.length < 5 && (
                                            <button type="button" onClick={addKeyRequirement}
                                                className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
                                                <Plus className="h-3.5 w-3.5" /> {t("jobForm.addRequirement")}
                                            </button>
                                        )}
                                    </div>

                                    {/* Role description */}
                                    <div className="space-y-2">
                                        <label className={labelClass}>{t("jobForm.roleDescription")} *</label>
                                        <RichTextEditor
                                            value={formData.description}
                                            onChange={(html) => setFormData(prev => ({ ...prev, description: html }))}
                                            placeholder={t("jobForm.roleDescPlaceholder")}
                                        />
                                    </div>

                                    {/* Management responsibility */}
                                    <div className="space-y-3">
                                        <label className={labelClass}>{t("jobForm.managementRequired")}</label>
                                        <div className="flex gap-3">
                                            <label className={cn(
                                                "flex items-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer transition-all text-sm font-medium",
                                                formData.management_required
                                                    ? "border-brand-500 bg-brand-50 text-brand-700"
                                                    : "border-slate-200 hover:bg-slate-50"
                                            )}>
                                                <input type="radio" name="mgmt_toggle" checked={formData.management_required}
                                                    onChange={() => setFormData(prev => ({ ...prev, management_required: true }))}
                                                    className="sr-only" />
                                                {t("jobForm.managementYes")}
                                            </label>
                                            <label className={cn(
                                                "flex items-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer transition-all text-sm font-medium",
                                                !formData.management_required
                                                    ? "border-brand-500 bg-brand-50 text-brand-700"
                                                    : "border-slate-200 hover:bg-slate-50"
                                            )}>
                                                <input type="radio" name="mgmt_toggle" checked={!formData.management_required}
                                                    onChange={() => setFormData(prev => ({ ...prev, management_required: false }))}
                                                    className="sr-only" />
                                                {t("jobForm.managementNo")}
                                            </label>
                                        </div>
                                        {formData.management_required && (
                                            <div className="grid grid-cols-2 gap-4 pl-1">
                                                <div className="space-y-2">
                                                    <label className={labelClass}>{t("jobForm.teamSize")}</label>
                                                    <Input type="number" name="team_size" value={formData.team_size} onChange={handleInputChange}
                                                        min="1" placeholder="e.g. 5" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className={labelClass}>{t("jobForm.reportingTo")}</label>
                                                    <Input name="reporting_to" value={formData.reporting_to} onChange={handleInputChange}
                                                        placeholder={t("jobForm.reportingToPlaceholder")} />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Position type & count */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.positionType")}</label>
                                            <select name="position_type" value={formData.position_type} onChange={handleInputChange} className={selectClass}>
                                                <option value="">{t("jobForm.selectPositionType")}</option>
                                                <option value="new">{t("jobForm.newPosition")}</option>
                                                <option value="replacement">{t("jobForm.replacement")}</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.openPositions")}</label>
                                            <Input type="number" name="open_positions" value={formData.open_positions} onChange={handleInputChange}
                                                min="1" max="100" />
                                        </div>
                                    </div>

                                    {/* Language requirements — multi */}
                                    <div className="space-y-3">
                                        <label className={labelClass}>{t("jobForm.languageRequirements")}</label>
                                        {languageRequirements.map((lr, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <select value={lr.language}
                                                    onChange={(e) => updateLanguageRequirement(i, "language", e.target.value)}
                                                    className={cn(selectClass, "flex-1")}>
                                                    <option value="">{t("jobForm.selectLanguage")}</option>
                                                    {EUROPEAN_LANGUAGE_OPTIONS.map(lang => (
                                                        <option key={lang} value={lang}>{lang}</option>
                                                    ))}
                                                </select>
                                                <select value={lr.level}
                                                    onChange={(e) => updateLanguageRequirement(i, "level", e.target.value)}
                                                    className={cn(selectClass, "w-36")}>
                                                    <option value="">{t("jobForm.selectLevel")}</option>
                                                    {LANGUAGE_LEVEL_OPTIONS.map(l => (
                                                        <option key={l} value={l}>{LANGUAGE_LEVEL_LABELS[l]}</option>
                                                    ))}
                                                </select>
                                                <button type="button" onClick={() => removeLanguageRequirement(i)}
                                                    className="text-slate-400 hover:text-danger-500 transition-colors p-1">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {languageRequirements.length < 3 && (
                                            <button type="button" onClick={addLanguageRequirement}
                                                className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
                                                <Plus className="h-3.5 w-3.5" /> {t("jobForm.addLanguage")}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 4: SALARY & BENEFITS ===== */}
                            {step === 4 && (
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className={labelClass}>{t("jobForm.maximumSalary")}</label>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
                                            <span className="text-sm font-semibold text-slate-700 tabular-nums">
                                                {calcState.salary.toLocaleString("sv-SE")} {calcState.currency}
                                            </span>
                                            <span className="text-xs text-slate-400">{t("jobForm.salaryFromCalculator") || "Set in calculator (step 1)"}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <select name="salary_gross_net" value={formData.salary_gross_net} onChange={handleInputChange} className={selectClass}>
                                                <option value="">{t("jobForm.grossNet")}</option>
                                                <option value="gross">{t("jobForm.gross")}</option>
                                                <option value="net">{t("jobForm.net")}</option>
                                            </select>
                                            <select name="salary_period" value={formData.salary_period} onChange={handleInputChange} className={selectClass}>
                                                <option value="">{t("jobForm.selectPeriod")}</option>
                                                {SALARY_PERIOD_OPTIONS.map(p => (
                                                    <option key={p} value={p}>{SALARY_PERIOD_LABELS[p]}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClass}>{t("jobForm.bonusStructure")}</label>
                                        <textarea name="bonus_structure" value={formData.bonus_structure} onChange={handleInputChange}
                                            className={cn(textareaClass, "min-h-[60px]")}
                                            placeholder={t("jobForm.bonusPlaceholder")} />
                                    </div>
                                    <div className="space-y-3">
                                        <label className={labelClass}>{t("jobForm.benefits")}</label>
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
                                        <label className={labelClass}>{t("jobForm.otherBenefits")}</label>
                                        <Input name="benefits_other" value={formData.benefits_other} onChange={handleInputChange}
                                            placeholder={t("jobForm.otherBenefitsPlaceholder")} />
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 5: RECRUITMENT & SCREENING ===== */}
                            {step === 5 && (
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className={labelClass}>{t("jobForm.applicationDeadline")}</label>
                                        <Input type="date" name="application_deadline" value={formData.application_deadline} onChange={handleInputChange} className="max-w-xs" />
                                        <p className="text-[10px] text-muted-foreground italic">{t("jobForm.deadlineHelp")}</p>
                                    </div>
                                    <div className="space-y-3 pt-2 border-t border-slate-100">
                                        <label className={labelClass}>{t("jobForm.screeningQuestions")}</label>
                                        {screeningQuestions.map((q, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                                                <Input value={q} onChange={(e) => updateScreeningQuestion(i, e.target.value)}
                                                    placeholder={`${t("jobForm.questionPlaceholder")} ${i + 1}`} className="flex-1" />
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
                                                <Plus className="h-3.5 w-3.5" /> {t("jobForm.addQuestion")}
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.numInterviews")}</label>
                                            <select name="num_interviews" value={formData.num_interviews} onChange={handleInputChange} className={selectClass}>
                                                <option value="">{t("jobForm.selectNumInterviews")}</option>
                                                <option value="1">1</option>
                                                <option value="2">2</option>
                                                <option value="3">3</option>
                                                <option value="4">4</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.interviewConductor")}</label>
                                            <Input name="interview_conductors" value={formData.interview_conductors} onChange={handleInputChange}
                                                placeholder={t("jobForm.interviewConductorPlaceholder")} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.assessmentType")}</label>
                                            <Input name="assessment_type" value={formData.assessment_type} onChange={handleInputChange}
                                                placeholder={t("jobForm.assessmentPlaceholder")} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" name="technical_test_required" id="technical_test_required"
                                            checked={formData.technical_test_required} onChange={handleInputChange} className={checkboxClass} />
                                        <label htmlFor="technical_test_required" className="text-sm text-slate-600">{t("jobForm.technicalTestRequired")}</label>
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 6: CONDITIONS & OTHER ===== */}
                            {step === 6 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.workingHours")}</label>
                                            <Input name="working_hours" value={formData.working_hours} onChange={handleInputChange}
                                                placeholder={t("jobForm.workingHoursPlaceholder")} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.shiftWork")}</label>
                                            <select name="shift_work" value={formData.shift_work} onChange={handleInputChange} className={selectClass}>
                                                <option value="">{t("jobForm.selectShiftWork")}</option>
                                                {SHIFT_WORK_OPTIONS.map(s => (
                                                    <option key={s} value={s}>{SHIFT_WORK_LABELS[s]}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    {(formData.shift_work === "yes" || formData.shift_work === "rotating") && (
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.shiftTimings")}</label>
                                            <Input name="shift_timings" value={formData.shift_timings} onChange={handleInputChange}
                                                placeholder={t("jobForm.shiftTimingsPlaceholder")} />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" name="flexible_hours" id="flexible_hours"
                                            checked={formData.flexible_hours} onChange={handleInputChange} className={checkboxClass} />
                                        <label htmlFor="flexible_hours" className="text-sm text-slate-600">{t("jobForm.flexibleHours")}</label>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelClass}>{t("jobForm.overtimePolicy")}</label>
                                        <Input name="overtime_policy" value={formData.overtime_policy} onChange={handleInputChange}
                                            placeholder={t("jobForm.overtimePlaceholder")} />
                                    </div>
                                    <div className="pt-2">
                                        <div className="space-y-2">
                                            <label className={labelClass}>{t("jobForm.desiredStartDate")}</label>
                                            <Input type="date" name="desired_start_date" value={formData.desired_start_date} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                    <div className="space-y-3 pt-2 border-t border-slate-100">
                                        <p className={labelClass}>{t("jobForm.otherInfo")}</p>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" name="travel_required" id="travel_required"
                                                checked={formData.travel_required} onChange={handleInputChange} className={checkboxClass} />
                                            <label htmlFor="travel_required" className="text-sm text-slate-600">{t("jobForm.travelRequired")}</label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" name="background_check_required" id="background_check_required"
                                                checked={formData.background_check_required} onChange={handleInputChange} className={checkboxClass} />
                                            <label htmlFor="background_check_required" className="text-sm text-slate-600">{t("jobForm.backgroundCheck")}</label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ===== STEP 7: DECLARATION ===== */}
                            {step === 7 && (
                                <div className="space-y-5">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                                        <h3 className="text-base font-bold text-slate-800">{t("jobForm.employerDeclarationTitle") || "Employer Declaration"}</h3>
                                        <p className="text-sm text-slate-600">{t("jobForm.employerDeclarationIntro") || "By submitting this job, the Employer confirms:"}</p>
                                        <ul className="space-y-2 text-sm text-slate-600 list-none">
                                            {[
                                                t("jobForm.employerDecl1") || "All job details (role, salary, requirements) are accurate and genuine",
                                                t("jobForm.employerDecl2") || "There is a real and active hiring need",
                                                t("jobForm.employerDecl3") || "Candidates will be reviewed and managed in a timely and professional manner",
                                                t("jobForm.employerDecl4") || "The Employer will make reasonable efforts to complete candidate review, interviews, and hiring decisions within 6 weeks of candidate submission",
                                                t("jobForm.employerDecl5") || "Candidate data will be handled in accordance with applicable data privacy regulations",
                                                t("jobForm.employerDecl6") || "The Employer will not bypass the platform to engage candidates directly",
                                                t("jobForm.employerDecl7") || "All applicable fees, terms, and guarantee conditions are accepted",
                                                t("jobForm.employerDecl8") || "The hiring process complies with local laws and regulations",
                                                t("jobForm.employerDecl9") || "The Employer agrees to pay €100 to the recruiter if a submitted candidate reaches and attends the final interview stage (decision stage)",
                                            ].map((item, i) => (
                                                <li key={i} className="flex gap-2">
                                                    <span className="text-slate-400 mt-0.5">•</span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="pt-2 border-t border-slate-200">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t("jobForm.referencePolicies") || "Reference Policies"}</p>
                                            <div className="flex flex-wrap gap-2">
                                                <Link href="/anvandarvillkor" target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors">
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    {t("jobForm.termsOfService") || "Terms of Service"}
                                                </Link>
                                                <Link href="/integritetspolicy" target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors">
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    {t("jobForm.privacyPolicy") || "Privacy Policy"}
                                                </Link>
                                                <Link href="/gdpr" target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors">
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    GDPR
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 pt-1">
                                        <input
                                            type="checkbox"
                                            id="declaration_confirmed"
                                            checked={declarationConfirmed}
                                            onChange={(e) => setDeclarationConfirmed(e.target.checked)}
                                            className={checkboxClass}
                                        />
                                        <label htmlFor="declaration_confirmed" className="text-sm font-medium text-slate-700 cursor-pointer">
                                            {t("jobForm.declarationConfirmText") || "I confirm that I have read and agree to the above declaration and all applicable policies."}
                                        </label>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation — always shows Publish button */}
                    <div className="flex justify-between items-center pt-8 mt-6 border-t border-slate-100">
                        <Button variant="ghost" onClick={prevStep} disabled={step === 1} className="gap-2">
                            <ChevronLeft className="h-4 w-4" /> {t("jobForm.previous")}
                        </Button>

                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={handleSaveDraft} disabled={loading || !formData.title}
                                className="gap-2 px-4">
                                {loading ? "Sparar..." : (t("jobForm.saveDraft") || "Save Draft")}
                            </Button>
                            {step < 7 ? (
                                <Button onClick={nextStep}
                                    className="bg-brand-600 hover:bg-brand-700 text-white gap-2 px-6 shadow-md shadow-brand-500/20"
                                    disabled={step === 1 && !formData.title}>
                                    {t("jobForm.nextStep")} <ChevronRight className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button onClick={handleSubmit} disabled={loading || !canPublish}
                                    title={!canPublish ? (t("jobForm.fillAllRequired") || "Fill all required fields and confirm the declaration") : undefined}
                                    className="bg-success-600 hover:bg-success-700 text-white gap-2 px-8 shadow-md shadow-success-500/20 disabled:opacity-50">
                                    {loading ? t("jobForm.publishing") : t("jobForm.completeAndPublish")}
                                    <Sparkles className="h-4 w-4 fill-current" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
