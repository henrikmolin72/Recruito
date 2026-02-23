"use client";

import { Reorder, useDragControls } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    GripVertical, Plus, Trash2, Search, MessageSquare,
    ClipboardCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import type { PipelineStage, PipelineStageType } from "@/types/db-types";
import { MAX_PIPELINE_STAGES, MAX_INTERVIEW_STAGES, MAX_TEST_STAGES } from "@/types/enums";

interface PipelineBuilderProps {
    stages: PipelineStage[];
    onChange: (stages: PipelineStage[]) => void;
    disabled?: boolean;
}

function getDefaultTitle(type: PipelineStageType, count: number): string {
    const titles: Record<PipelineStageType, string> = {
        screening: `Screening ${count > 1 ? count : ''}`.trim(),
        interview: `Intervju ${count}`,
        test: `Test ${count > 1 ? count : ''}`.trim(),
        assessment: `Bedömning ${count > 1 ? count : ''}`.trim(),
    };
    return titles[type];
}

function getStageTypeIcon(type: PipelineStageType) {
    const icons: Record<PipelineStageType, React.ReactNode> = {
        screening: <Search className="h-4 w-4" />,
        interview: <MessageSquare className="h-4 w-4" />,
        test: <ClipboardCheck className="h-4 w-4" />,
        assessment: <ClipboardCheck className="h-4 w-4" />,
    };
    return icons[type];
}

function getStageTypeColor(type: PipelineStageType): string {
    const colors: Record<PipelineStageType, string> = {
        screening: "text-indigo-500 bg-indigo-50",
        interview: "text-purple-500 bg-purple-50",
        test: "text-cyan-600 bg-cyan-50",
        assessment: "text-teal-600 bg-teal-50",
    };
    return colors[type];
}

function getStageTypeLabel(type: PipelineStageType): string {
    const labels: Record<PipelineStageType, string> = {
        screening: "Screening",
        interview: "Intervju",
        test: "Test",
        assessment: "Bedömning",
    };
    return labels[type];
}

export function PipelineBuilder({ stages, onChange, disabled }: PipelineBuilderProps) {
    const { t } = useTranslations();

    const interviewCount = stages.filter(s => s.type === 'interview').length;
    const testCount = stages.filter(s => s.type === 'test' || s.type === 'assessment').length;

    const handleReorder = (newOrder: PipelineStage[]) => {
        const updated = newOrder.map((stage, index) => ({ ...stage, order: index }));
        onChange(updated);
    };

    const addStage = (type: PipelineStageType) => {
        const count = stages.filter(s => s.type === type).length + 1;
        const newStage: PipelineStage = {
            id: `${type}-${count}-${Date.now()}`,
            type,
            title: getDefaultTitle(type, count),
            order: stages.length,
        };
        onChange([...stages, newStage]);
    };

    const removeStage = (id: string) => {
        const updated = stages
            .filter(s => s.id !== id)
            .map((s, i) => ({ ...s, order: i }));
        onChange(updated);
    };

    const updateStage = (id: string, updates: Partial<PipelineStage>) => {
        onChange(stages.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    return (
        <div className="space-y-4">
            {/* Visual flow indicator */}
            <div className="flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{t("components.pipelineSubmitted") || "Inskickad"}</span>
                <span>→</span>
                <span className="text-slate-300">{t("components.pipelineYourStages") || "Dina steg"}</span>
                <span>→</span>
                <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded">{t("components.pipelineOffer") || "Erbjudande"}</span>
                <span>→</span>
                <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded">{t("components.pipelineHired") || "Anställd"}</span>
            </div>

            {/* Reorderable stages */}
            <Reorder.Group axis="y" values={stages} onReorder={handleReorder} className="space-y-2">
                {stages.map((stage) => (
                    <PipelineStageItem
                        key={stage.id}
                        stage={stage}
                        onUpdate={updateStage}
                        onRemove={removeStage}
                        canRemove={stages.length > 1}
                        disabled={disabled}
                    />
                ))}
            </Reorder.Group>

            {/* Add stage buttons */}
            {stages.length < MAX_PIPELINE_STAGES && !disabled && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                    {interviewCount < MAX_INTERVIEW_STAGES && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addStage('interview')}
                            className="gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <MessageSquare className="h-3.5 w-3.5" />
                            {t("components.pipelineAddInterview") || "Lägg till intervju"}
                        </Button>
                    )}
                    {testCount < MAX_TEST_STAGES && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addStage('test')}
                            className="gap-1.5 text-cyan-600 border-cyan-200 hover:bg-cyan-50"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            {t("components.pipelineAddTest") || "Lägg till test"}
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addStage('screening')}
                        className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <Search className="h-3.5 w-3.5" />
                        {t("components.pipelineAddScreening") || "Lägg till screening"}
                    </Button>
                </div>
            )}

            {/* Stage count info */}
            <p className="text-[10px] text-muted-foreground italic px-1">
                {stages.length}/{MAX_PIPELINE_STAGES} {t("components.pipelineStagesUsed") || "steg använda"} · {interviewCount}/{MAX_INTERVIEW_STAGES} {t("components.pipelineInterviews") || "intervjuer"} · {testCount}/{MAX_TEST_STAGES} {t("components.pipelineTests") || "tester"}
            </p>
        </div>
    );
}

function PipelineStageItem({
    stage,
    onUpdate,
    onRemove,
    canRemove,
    disabled,
}: {
    stage: PipelineStage;
    onUpdate: (id: string, updates: Partial<PipelineStage>) => void;
    onRemove: (id: string) => void;
    canRemove: boolean;
    disabled?: boolean;
}) {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={stage}
            dragControls={dragControls}
            dragListener={false}
        >
            <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 flex items-center gap-3">
                    {/* Drag handle */}
                    <button
                        type="button"
                        onPointerDown={(e) => !disabled && dragControls.start(e)}
                        className={cn(
                            "touch-none text-slate-400 hover:text-slate-600 transition-colors",
                            disabled ? "cursor-not-allowed opacity-30" : "cursor-grab active:cursor-grabbing"
                        )}
                    >
                        <GripVertical className="h-5 w-5" />
                    </button>

                    {/* Stage type icon */}
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", getStageTypeColor(stage.type))}>
                        {getStageTypeIcon(stage.type)}
                    </div>

                    {/* Editable title */}
                    <Input
                        value={stage.title}
                        onChange={(e) => onUpdate(stage.id, { title: e.target.value })}
                        className="h-8 text-sm font-medium flex-1 border-transparent hover:border-slate-200 focus:border-brand-500 transition-colors"
                        disabled={disabled}
                        placeholder="Stegnamn..."
                    />

                    {/* Stage type badge */}
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex-shrink-0",
                        getStageTypeColor(stage.type)
                    )}>
                        {getStageTypeLabel(stage.type)}
                    </span>

                    {/* Order indicator */}
                    <span className="text-[10px] font-bold text-slate-300 w-5 text-center flex-shrink-0">
                        {stage.order + 1}
                    </span>

                    {/* Remove button */}
                    {canRemove && !disabled && (
                        <button
                            type="button"
                            onClick={() => onRemove(stage.id)}
                            className="text-slate-300 hover:text-danger-500 transition-colors flex-shrink-0"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </CardContent>
            </Card>
        </Reorder.Item>
    );
}
