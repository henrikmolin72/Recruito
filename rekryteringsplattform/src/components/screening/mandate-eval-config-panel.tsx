"use client";

import { useState } from "react";
import { Save, Check, Loader2, ChevronDown, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveMandateEvalConfig } from "@/lib/actions/screening";
import type { EvalConfig } from "@/lib/screening/evaluation-prompt";

type Props = {
  mandateId: string;
  initialConfig: EvalConfig | null;
  dict: Record<string, string>;
};

const splitList = (v: string): string[] =>
  v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);

// Assignment-level editor for the AI evaluation sector context. The config lives
// on job_mandates and is consumed by every candidate evaluation on this mandate —
// the recruiter's pre-submission self-check and Recruito's official score run.
// (Split out of the former per-candidate EvaluationPromptPanel so config is edited
// where it belongs — on the assignment — and the candidate page stays read-only.)
export function MandateEvalConfigPanel({ mandateId, initialConfig, dict: r }: Props) {
  const [open, setOpen] = useState(false);
  const [targetSector, setTargetSector] = useState(initialConfig?.targetSector ?? "");
  const [adjacent, setAdjacent] = useState((initialConfig?.adjacentSectors ?? []).join(", "));
  const [skills, setSkills] = useState((initialConfig?.transferableSkills ?? []).join(", "));
  const [keywords, setKeywords] = useState((initialConfig?.customKeywords ?? []).join(", "));

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await saveMandateEvalConfig(mandateId, {
      targetSector: targetSector.trim() || null,
      adjacentSectors: splitList(adjacent),
      transferableSkills: splitList(skills),
      customKeywords: splitList(keywords),
    });
    setSaving(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {r.aiEvalTitle || "AI evaluation"}
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            {r.aiEvalConfigIntro ||
              "Set the sector context for this assignment's AI evaluations. It applies to every candidate you present."}
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                {r.aiEvalTargetSector || "Target sector"}
              </label>
              <Input value={targetSector} onChange={(e) => setTargetSector(e.target.value)} placeholder={r.aiEvalTargetSectorPlaceholder || "e.g. Fintech"} className="text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                {r.aiEvalAdjacentSectors || "Adjacent sectors"} <span className="font-normal lowercase">{r.aiEvalCommaSeparated || "(comma-separated)"}</span>
              </label>
              <Input value={adjacent} onChange={(e) => setAdjacent(e.target.value)} placeholder={r.aiEvalAdjacentPlaceholder || "Banking, Insurance, SaaS"} className="text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                {r.aiEvalTransferableSkills || "Transferable skills"} <span className="font-normal lowercase">{r.aiEvalCommaSeparated || "(comma-separated)"}</span>
              </label>
              <Textarea value={skills} onChange={(e) => setSkills(e.target.value)} placeholder={r.aiEvalSkillsPlaceholder || "Risk analysis, Compliance, API integrations"} className="text-sm min-h-[60px]" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                {r.aiEvalExtraKeywords || "Extra keywords"} <span className="font-normal lowercase">{r.aiEvalCommaSeparated || "(comma-separated)"}</span>
              </label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder={r.aiEvalKeywordsPlaceholder || "PSD2, KYC"} className="text-sm" />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <Button type="button" onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? (r.aiEvalSaved || "Saved") : (r.aiEvalSave || "Save")}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
