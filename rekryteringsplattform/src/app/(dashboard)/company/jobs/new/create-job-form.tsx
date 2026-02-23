"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createJob } from "@/lib/actions/jobs";
import { ArrowLeft, Check, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PipelineBuilder } from "@/components/dashboard/company/pipeline-builder";
import { DEFAULT_PIPELINE_STAGES } from "@/types/enums";
import type { PipelineStage } from "@/types/db-types";

const STEPS = [
    { id: 1, title: "Grunderna", description: "Titel och plats" },
    { id: 2, title: "Rollen", description: "Beskrivning" },
    { id: 3, title: "Villkor", description: "Lön och arvode" },
    { id: 4, title: "Process", description: "Rekryteringsprocess" }
];

interface CreateJobFormProps {
    feePercentage: number;
    tierLabel: string;
}

export function CreateJobForm({ feePercentage, tierLabel }: CreateJobFormProps) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(DEFAULT_PIPELINE_STAGES);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        location: "",
        industry: "",
        employment_type: "Heltid",
        max_recruiters: "5",
        salary_min: "",
        salary_max: "",
        salary_currency: "SEK",
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const nextStep = () => {
        if (step < 4) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    async function handleSubmit() {
        setLoading(true);
        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => data.append(key, value));
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
            {/* Header with Back Button */}
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

            {/* Step Indicator */}
            <div className="flex items-center justify-between px-2">
                {STEPS.map((s, i) => (
                    <div key={s.id} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-2">
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm",
                                step >= s.id ? "bg-brand-600 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                            </div>
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest",
                                step === s.id ? "text-brand-600" : "text-muted-foreground"
                            )}>
                                {s.title}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={cn(
                                "h-[2px] flex-1 mx-4 rounded-full transition-all",
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
                            className="space-y-6"
                        >
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Vad letar ni efter?</label>
                                        <Input
                                            name="title"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            placeholder="t.ex. Senior Fullstack Developer"
                                            className="h-12 border-slate-200 focus:border-brand-500 transition-all font-medium"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">Stad / Plats</label>
                                            <Input
                                                name="location"
                                                value={formData.location}
                                                onChange={handleInputChange}
                                                placeholder="t.ex. Stockholm / Remote"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">Bransch</label>
                                            <Input
                                                name="industry"
                                                value={formData.industry}
                                                onChange={handleInputChange}
                                                placeholder="t.ex. IT & SaaS"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Beskrivning av rollen</label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            className="flex min-h-[180px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-all leading-relaxed"
                                            placeholder="Berätta om arbetsuppgifter, krav och vad ni erbjuder..."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Anställningsform</label>
                                        <select
                                            name="employment_type"
                                            value={formData.employment_type}
                                            onChange={handleInputChange}
                                            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-all font-medium"
                                        >
                                            <option value="Heltid">Heltid</option>
                                            <option value="Deltid">Deltid</option>
                                            <option value="Konsult">Konsult (B2B)</option>
                                            <option value="Frilans">Frilans</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">Max antal rekryterare</label>
                                            <Input
                                                type="number"
                                                name="max_recruiters"
                                                value={formData.max_recruiters}
                                                onChange={handleInputChange}
                                                min="1"
                                                max="10"
                                            />
                                            <p className="text-[10px] text-muted-foreground italic">Standard är 5 rekryterare per uppdrag</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">Arvode</label>
                                            <div className="flex items-center h-10 px-4 rounded-xl border border-slate-200 bg-slate-50">
                                                <span className="text-sm font-bold text-brand-600">{feePercentage}%</span>
                                                <span className="ml-2 text-xs text-muted-foreground">({tierLabel})</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground italic">Baseras på ert antal placeringar senaste 12 månader</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Ersättning till kandidat (Indikation)</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <Input
                                                type="number"
                                                name="salary_min"
                                                value={formData.salary_min}
                                                onChange={handleInputChange}
                                                placeholder="Från"
                                            />
                                            <Input
                                                type="number"
                                                name="salary_max"
                                                value={formData.salary_max}
                                                onChange={handleInputChange}
                                                placeholder="Till"
                                            />
                                            <select
                                                name="salary_currency"
                                                value={formData.salary_currency}
                                                onChange={handleInputChange}
                                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                            >
                                                <option value="SEK">kr (SEK)</option>
                                                <option value="EUR">€ (EUR)</option>
                                                <option value="USD">$ (USD)</option>
                                            </select>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">Anges som grov uppskattning för att hjälpa rekryterare.</p>
                                    </div>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-500">
                                        Dra och släpp för att ändra ordning på stegen. Lägg till intervjuer och tester efter behov.
                                    </p>
                                    <PipelineBuilder
                                        stages={pipelineStages}
                                        onChange={setPipelineStages}
                                    />
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    <div className="flex justify-between items-center pt-8 mt-6 border-t border-slate-100">
                        <Button
                            variant="ghost"
                            onClick={prevStep}
                            disabled={step === 1}
                            className="gap-2"
                        >
                            <ChevronLeft className="h-4 w-4" /> Föregående
                        </Button>

                        {step < 4 ? (
                            <Button
                                onClick={nextStep}
                                className="bg-brand-600 hover:bg-brand-700 text-white gap-2 px-6 shadow-md shadow-brand-500/20"
                                disabled={step === 1 && !formData.title}
                            >
                                Nästa steg <ChevronRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-success-600 hover:bg-success-700 text-white gap-2 px-8 shadow-md shadow-success-500/20"
                            >
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
