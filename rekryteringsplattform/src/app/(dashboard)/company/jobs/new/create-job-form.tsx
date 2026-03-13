"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createJob } from "@/lib/actions/jobs";
import { ArrowLeft, Check, ChevronRight, ChevronLeft, Sparkles, Plus, X, Calculator } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PipelineBuilder } from "@/components/dashboard/company/pipeline-builder";
import { DEFAULT_PIPELINE_STAGES } from "@/types/enums";
import type { PipelineStage } from "@/types/db-types";
import { useTranslations } from "@/i18n/client";
import { RecruitmentCalculator } from "@/components/layout/recruitment-calculator";
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
} from "@/lib/job-form-options";

const selectClass = "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-all font-medium";
const labelClass = "text-sm font-semibold text-slate-700";
const textareaClass = "flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-all leading-relaxed";
const checkboxClass = "h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500";

interface CreateJobFormProps {
    feePercentage: number;
    tierLabel: string;
}

interface LanguageRequirement {
    language: string;
    level: string;
}

function fmt(n: number): string {
    return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

export function CreateJobForm({ feePercentage }: CreateJobFormProps) {
    const router = useRouter();
    const { t } = useTranslations();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(DEFAULT_PIPELINE_STAGES);
    const [screeningQuestions, setScreeningQuestions] = useState<string[]>([""]);
    const [keyRequirements, setKeyRequirements] = useState<string[]>([""]);
    const [languageRequirements, setLanguageRequirements] = useState<LanguageRequirement[]>([]);
    const [estimatedFee, setEstimatedFee] = useState(0);
    const [feeConfirmed, setFeeConfirmed] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleFeeChange = useCallback((fee: number) => {
        setEstimatedFee(fee);
    }, []);

    const handleGuaranteeChange = useCallback((months: number) => {
        setFormData(prev => ({ ...prev, guarantee_period_months: months === 0 ? "" : String(months) }));
    }, []);

    const STEPS = [
        { id: 1, title: t("jobForm.calcTitle"), icon: "calc" },
        { id: 2, title: t("jobForm.step1Title"), icon: "1" },
        { id: 3, title: t("jobForm.step2Title"), icon: "2" },
        { id: 4, title: t("jobForm.step3Title"), icon: "3" },
        { id: 5, title: t("jobForm.step4Title"), icon: "4" },
        { id: 6, title: t("jobForm.step5Title"), icon: "5" },
        { id: 7, title: t("jobForm.step6Title"), icon: "6" },
        { id: 8, title: t("jobForm.step7Title"), icon: "7" },
        { id: 9, title: t("jobForm.step8Title"), icon: "8" },
    ];

    const BENEFIT_LABELS: Record<string, string> = {
        bonus: t("jobForm.benefitBonus"),
        meal_vouchers: t("jobForm.benefitMealVouchers"),
        health_insurance: t("jobForm.benefitHealthInsurance"),
        pension: t("jobForm.benefitPension"),
        profit_sharing: t("jobForm.benefitProfitSharing"),
        stock_options: t("jobForm.benefitStockOptions"),
        relocation_package: t("jobForm.benefitRelocation"),
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
        // Step 2 (Basics)
        title: "",
        country: "",
        city: "",
        location_code: "",
        location: "",
        industry: "",
        is_confidential: false,
        // Step 3 (Employment)
        employment_type: "Full-time",
        contract_duration: "",
        work_type: "",
        remote_type: "",
        work_permit_accepted: false,
        visa_sponsorship: false,
        // Step 4 (Role)
        description: "",
        management_required: false,
        team_size: "",
        reporting_to: "",
        position_type: "",
        open_positions: "1",
        // Step 5 (Salary)
        salary_min: "",
        salary_max: "",
        salary_currency: "EUR",
        salary_gross_net: "",
        salary_period: "",
        bonus_structure: "",
        benefits: [] as string[],
        benefits_other: "",
        // Step 6 (Recruitment)
        application_deadline: "",
        guarantee_period_months: "",
        // Step 7 (Screening)
        num_interviews: "",
        interview_conductors: "",
        technical_test_required: false,
        assessment_type: "",
        // Step 8 (Conditions)
        working_hours: "",
        flexible_hours: false,
        shift_work: "",
        shift_timings: "",
        overtime_policy: "",
        desired_start_date: "",
        urgency_level: "",
        // Step 9 (Other)
        travel_required: false,
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
    };

    const nextStep = () => {
        if (step < 9) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    function buildFormData(asDraft: boolean) {
        const data = new FormData();

        // Append all text/number fields
        for (const [key, value] of Object.entries(formData)) {
            if (key === "benefits") continue;
            if (typeof value === "boolean") {
                if (value) data.append(key, "on");
            } else {
                data.append(key, String(value));
            }
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

        if (asDraft) {
            data.append("_save_as_draft", "true");
        }

        return data;
    }

    async function handleSubmit() {
        if (!feeConfirmed) {
            toast.error("Please confirm the fee review checkbox before publishing.");
            return;
        }

        setLoading(true);
        const data = buildFormData(false);

        const result = await createJob(data);
        if (result?.error) {
            toast.error(result.error);
            setLoading(false);
        } else {
            toast.success(t("jobForm.jobPublished"));
            router.push("/company/jobs");
        }
    }

    async function handleSaveDraft() {
        if (!formData.title?.trim()) {
            toast.error(t("jobForm.titleRequired") || "Titel krävs för att spara utkast");
            return;
        }

        setLoading(true);
        const data = buildFormData(true);

        const result = await createJob(data);
        if (result?.error) {
            toast.error(result.error);
            setLoading(false);
        } else {
            toast.success(t("jobForm.draftSaved") || "Utkast sparat");
            router.push("/company/jobs");
        }
    }

    return (
        <div className="flex min-h-screen">
            {/* ─── Left Vertical Navigation ─── */}
            <nav className="hidden md:flex flex-col w-56 border-r border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 h-screen overflow-y-auto py-6 px-3 shrink-0">
                <Link href="/company/jobs" className="flex items-center gap-2 px-3 mb-6 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    {t("common.back")}
                </Link>

                <div className="space-y-0.5">
                    {STEPS.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => goToStep(s.id)}
                            className={cn(
                                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left",
                                step === s.id
                                    ? "bg-brand-50 text-brand-700 shadow-sm"
                                    : step > s.id
                                    ? "text-slate-500 hover:bg-slate-50"
                                    : "text-slate-400 hover:bg-slate-50"
                            )}
                        >
                            <div className={cn(
                                "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                step === s.id
                                    ? "bg-brand-600 text-white"
                                    : step > s.id
                                    ? "bg-brand-100 text-brand-600"
                                    : "bg-slate-100 text-slate-400"
                            )}>
                                {step > s.id ? <Check className="h-3 w-3" /> : s.icon === "calc" ? <Calculator className="h-3 w-3" /> : s.icon}
                            </div>
                            <span className="truncate">{s.title}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* ─── Main Content Area ─── */}
            <div className="flex-1 relative">
                {/* ─── Sticky Estimated Fee Display (top-right) ─── */}
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100">
                    <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">{t("jobForm.createTitle")}</h1>
                            <p className="text-xs text-muted-foreground">{t("jobForm.createSubtitle")}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-500">
                                Estimated Fee
                            </div>
                            <div className="text-2xl font-black text-brand-700 tabular-nums leading-tight">
                                €{fmt(estimatedFee)} <span className="text-sm font-bold">EUR</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Mobile Step Indicator ─── */}
                <div className="md:hidden flex items-center gap-1 px-4 py-3 overflow-x-auto border-b border-slate-100">
                    {STEPS.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => goToStep(s.id)}
                            className={cn(
                                "shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                                step === s.id ? "bg-brand-600 text-white" : step > s.id ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-400"
                            )}
                        >
                            {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.icon === "calc" ? <Calculator className="h-3 w-3" /> : s.icon}
                        </button>
                    ))}
                </div>

                {/* ─── Form Content ─── */}
                <div className="max-w-2xl mx-auto py-6 px-6">
                    <Card className="border-none shadow-xl shadow-brand-500/5 bg-white/80 backdrop-blur-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">{STEPS[step - 1].title}</CardTitle>
                            <CardDescription>
                                {step === 1 ? t("jobForm.calcDesc") : STEPS[step - 1].title}
                            </CardDescription>
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
                                    {/* ===== STEP 1: RECRUITMENT FEE CALCULATOR ===== */}
                                    {step === 1 && (
                                        <RecruitmentCalculator embedded onFeeChange={handleFeeChange} onGuaranteeChange={handleGuaranteeChange} />
                                    )}

                                    {/* ===== STEP 2: BASICS ===== */}
                                    {step === 2 && (
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
                                            <div className="flex items-center gap-3 pt-1">
                                                <input type="checkbox" name="is_confidential" id="is_confidential"
                                                    checked={formData.is_confidential} onChange={handleInputChange} className={checkboxClass} />
                                                <label htmlFor="is_confidential" className="text-sm text-slate-600">{t("jobForm.confidential")}</label>
                                            </div>
                                        </div>
                                    )}

                                    {/* ===== STEP 3: EMPLOYMENT & WORK TYPE ===== */}
                                    {step === 3 && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className={labelClass}>{t("jobForm.employmentType")} *</label>
                                                    <select name="employment_type" value={formData.employment_type} onChange={handleInputChange} className={selectClass}>
                                                        {EMPLOYMENT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                {(formData.employment_type === "Consultant") && (
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

                                    {/* ===== STEP 4: DESCRIPTION & REQUIREMENTS ===== */}
                                    {step === 4 && (
                                        <div className="space-y-4">
                                            {/* Key Requirements */}
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
                                                <textarea name="description" value={formData.description} onChange={handleInputChange}
                                                    className={cn(textareaClass, "min-h-[160px]")}
                                                    placeholder={t("jobForm.roleDescPlaceholder")} required />
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

                                            {/* Language requirements */}
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

                                    {/* ===== STEP 5: SALARY & BENEFITS ===== */}
                                    {step === 5 && (
                                        <div className="space-y-5">
                                            <div className="space-y-2">
                                                <label className={labelClass}>{t("jobForm.salaryRange")}</label>
                                                <div className="grid grid-cols-4 gap-2">
                                                    <Input type="number" name="salary_min" value={formData.salary_min} onChange={handleInputChange} placeholder={t("jobForm.salaryFrom")} />
                                                    <Input type="number" name="salary_max" value={formData.salary_max} onChange={handleInputChange} placeholder={t("jobForm.salaryTo")} />
                                                    <select name="salary_currency" value={formData.salary_currency} onChange={handleInputChange} className={selectClass}>
                                                        {SALARY_CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                    <select name="salary_gross_net" value={formData.salary_gross_net} onChange={handleInputChange} className={selectClass}>
                                                        <option value="">{t("jobForm.grossNet")}</option>
                                                        <option value="gross">{t("jobForm.gross")}</option>
                                                        <option value="net">{t("jobForm.net")}</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>{t("jobForm.salaryPeriod")}</label>
                                                <select name="salary_period" value={formData.salary_period} onChange={handleInputChange} className={selectClass}>
                                                    <option value="">{t("jobForm.selectPeriod")}</option>
                                                    {SALARY_PERIOD_OPTIONS.map(p => (
                                                        <option key={p} value={p}>{SALARY_PERIOD_LABELS[p]}</option>
                                                    ))}
                                                </select>
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

                                    {/* ===== STEP 6: RECRUITMENT DETAILS ===== */}
                                    {step === 6 && (
                                        <div className="space-y-5">
                                            <div className="space-y-2">
                                                <label className={labelClass}>{t("jobForm.applicationDeadline")}</label>
                                                <Input type="date" name="application_deadline" value={formData.application_deadline} onChange={handleInputChange} />
                                                <p className="text-[10px] text-muted-foreground italic">{t("jobForm.deadlineHelp")}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* ===== STEP 7: SCREENING & HIRING PROCESS ===== */}
                                    {step === 7 && (
                                        <div className="space-y-5">
                                            <div className="space-y-3">
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
                                            <div className="grid grid-cols-2 gap-4">
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
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" name="technical_test_required" id="technical_test_required"
                                                        checked={formData.technical_test_required} onChange={handleInputChange} className={checkboxClass} />
                                                    <label htmlFor="technical_test_required" className="text-sm text-slate-600">{t("jobForm.assessmentRequired")}</label>
                                                </div>
                                                {formData.technical_test_required && (
                                                    <div className="space-y-2 pl-7">
                                                        <label className={labelClass}>{t("jobForm.assessmentDetails")}</label>
                                                        <Input name="assessment_type" value={formData.assessment_type} onChange={handleInputChange}
                                                            placeholder={t("jobForm.assessmentDetailsPlaceholder")} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ===== STEP 8: WORKING CONDITIONS & TIMELINE ===== */}
                                    {step === 8 && (
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
                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                <div className="space-y-2">
                                                    <label className={labelClass}>{t("jobForm.desiredStartDate")}</label>
                                                    <Input type="date" name="desired_start_date" value={formData.desired_start_date} onChange={handleInputChange} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className={labelClass}>{t("jobForm.priorityLevel")}</label>
                                                    <select name="urgency_level" value={formData.urgency_level} onChange={handleInputChange} className={selectClass}>
                                                        <option value="">{t("jobForm.selectPriority")}</option>
                                                        <option value="1">{t("jobForm.priority1")}</option>
                                                        <option value="2">{t("jobForm.priority2")}</option>
                                                        <option value="3">{t("jobForm.priority3")}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ===== STEP 9: OTHER + PIPELINE ===== */}
                                    {step === 9 && (
                                        <div className="space-y-5">
                                            <div className="space-y-3">
                                                <p className={labelClass}>{t("jobForm.otherInfo")}</p>
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" name="travel_required" id="travel_required"
                                                        checked={formData.travel_required} onChange={handleInputChange} className={checkboxClass} />
                                                    <label htmlFor="travel_required" className="text-sm text-slate-600">{t("jobForm.travelRequired")}</label>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 pt-2">
                                                <input type="checkbox" id="terms_accepted"
                                                    checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className={cn(checkboxClass, "mt-0.5")} />
                                                <label htmlFor="terms_accepted" className="text-sm text-slate-600">
                                                    {t("jobForm.termsAcceptText")}{" "}
                                                    <a href="/policy-pack" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline hover:text-brand-700">
                                                        {t("jobForm.termsAndConditions")}
                                                    </a>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {/* ─── Fee Confirmation Checkbox (before publish) ─── */}
                            <div className="mt-8 pt-4 border-t border-slate-100">
                                <label className={cn(
                                    "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all",
                                    feeConfirmed
                                        ? "border-brand-500 bg-brand-50"
                                        : "border-slate-200 hover:bg-slate-50"
                                )}>
                                    <input
                                        type="checkbox"
                                        checked={feeConfirmed}
                                        onChange={(e) => setFeeConfirmed(e.target.checked)}
                                        className={cn(checkboxClass, "mt-0.5")}
                                    />
                                    <span className="text-sm text-slate-600 leading-relaxed">
                                        {t("jobForm.feeConfirmation")}
                                    </span>
                                </label>
                            </div>

                            {/* Navigation */}
                            <div className="flex justify-between items-center pt-6 mt-4 border-t border-slate-100">
                                <Button variant="ghost" onClick={prevStep} disabled={step === 1} className="gap-2">
                                    <ChevronLeft className="h-4 w-4" /> {t("jobForm.previous")}
                                </Button>

                                <div className="flex items-center gap-3">
                                    <Button variant="outline" onClick={handleSaveDraft} disabled={loading || !formData.title?.trim()}
                                        className="gap-2 px-5 text-slate-600 border-slate-300 hover:bg-slate-50">
                                        {loading ? (t("jobForm.saving") || "Sparar...") : (t("jobForm.saveDraft") || "Spara utkast")}
                                    </Button>
                                    {step < 9 && (
                                        <Button onClick={nextStep}
                                            className="bg-brand-600 hover:bg-brand-700 text-white gap-2 px-6 shadow-md shadow-brand-500/20"
                                            disabled={step === 2 && !formData.title}>
                                            {t("jobForm.nextStep")} <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <div className={cn("group", step < 9 && "relative")}>
                                        <Button onClick={handleSubmit} disabled={loading || !feeConfirmed || !termsAccepted}
                                            className={cn(
                                                "bg-success-600 hover:bg-success-700 text-white gap-2 px-8 shadow-md shadow-success-500/20 transition-opacity duration-200",
                                                step < 9 && "opacity-0 group-hover:opacity-100"
                                            )}>
                                            {loading ? t("jobForm.publishing") : t("jobForm.completeAndPublish")}
                                            <Sparkles className="h-4 w-4 fill-current" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
