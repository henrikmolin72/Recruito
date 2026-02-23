"use client";

import { useState } from "react";
import { PipelineBuilder } from "./pipeline-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Save, AlertTriangle, RotateCcw } from "lucide-react";
import { updatePipelineStages } from "@/lib/actions/jobs";
import { toast } from "sonner";
import type { PipelineStage } from "@/types/db-types";
import { useTranslations } from "@/i18n/client";

interface PipelineEditorProps {
    jobId: string;
    initialStages: PipelineStage[];
    hasCandidates: boolean;
}

export function PipelineEditor({ jobId, initialStages, hasCandidates }: PipelineEditorProps) {
    const [stages, setStages] = useState(initialStages);
    const [saving, setSaving] = useState(false);
    const { t } = useTranslations();

    const hasChanges = JSON.stringify(stages) !== JSON.stringify(initialStages);

    const handleSave = async () => {
        setSaving(true);
        const result = await updatePipelineStages(jobId, stages);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(t("company.pipelineSaved") || "Processen har sparats!");
        }
        setSaving(false);
    };

    const handleReset = () => {
        setStages(initialStages);
    };

    return (
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
            <CardHeader>
                <CardTitle className="text-xl">{t("company.processTitle") || "Rekryteringsprocess"}</CardTitle>
                <CardDescription>{t("company.processDescription") || "Anpassa stegen i er rekryteringsprocess för detta uppdrag"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {hasCandidates && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>{t("company.pipelineWarningCandidates") || "Det finns aktiva kandidater i denna process. Var försiktig vid borttagning av steg."}</span>
                    </div>
                )}

                <PipelineBuilder stages={stages} onChange={setStages} />

                {hasChanges && (
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="gap-1.5 text-slate-500"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {t("common.reset") || "Återställ"}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? (t("common.saving") || "Sparar...") : (t("common.saveChanges") || "Spara ändringar")}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
