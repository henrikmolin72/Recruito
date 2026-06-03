"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles, Copy, Check, Download, Save, Loader2, ChevronDown, X, FileText } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  saveMandateEvalConfig,
  buildEvaluationPrompt,
  type StoredEvaluation,
} from "@/lib/actions/screening";
import type { EvalConfig } from "@/lib/screening/evaluation-prompt";
import { MarkdownReport } from "./markdown-report";

type Props = {
  candidateId: string;
  mandateId: string;
  initialConfig: EvalConfig | null;
  initialReport: StoredEvaluation | null;
};

const splitList = (v: string): string[] =>
  v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);

const RUN_ERRORS: Record<string, string> = {
  no_cv: "Inget CV är uppladdat för kandidaten.",
  unsupported_cv_format: "CV-formatet stöds inte för automatisk körning (endast PDF/TXT). Använd Kopiera-knappen istället.",
};

export function EvaluationPromptPanel({ candidateId, mandateId, initialConfig, initialReport }: Props) {
  const [open, setOpen] = useState(false);
  const [targetSector, setTargetSector] = useState(initialConfig?.targetSector ?? "");
  const [adjacent, setAdjacent] = useState((initialConfig?.adjacentSectors ?? []).join(", "));
  const [skills, setSkills] = useState((initialConfig?.transferableSkills ?? []).join(", "));
  const [keywords, setKeywords] = useState((initialConfig?.customKeywords ?? []).join(", "));

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<string | null>(initialReport?.reportMarkdown ?? null);
  const [reportAt, setReportAt] = useState<string | null>(initialReport?.createdAt ?? null);
  const [reportOpen, setReportOpen] = useState(false);

  function currentConfig(): EvalConfig {
    return {
      targetSector: targetSector.trim() || null,
      adjacentSectors: splitList(adjacent),
      transferableSkills: splitList(skills),
      customKeywords: splitList(keywords),
    };
  }

  async function persistConfig(): Promise<boolean> {
    const res = await saveMandateEvalConfig(mandateId, currentConfig());
    if ("error" in res) {
      setError(res.error);
      return false;
    }
    return true;
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const ok = await persistConfig();
    setSaving(false);
    if (!ok) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    if (!(await persistConfig())) {
      setRunning(false);
      return;
    }
    try {
      const res = await fetch("/api/screening-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, mandateId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(RUN_ERRORS[json?.error] || json?.error || "Utvärderingen misslyckades.");
        return;
      }
      setReport(json.reportMarkdown);
      setReportAt(json.createdAt);
      setReportOpen(true);
    } catch {
      setError("Nätverksfel — försök igen.");
    } finally {
      setRunning(false);
    }
  }

  async function handleCopy() {
    setCopying(true);
    setError(null);
    setCopied(false);
    if (!(await persistConfig())) {
      setCopying(false);
      return;
    }
    const res = await buildEvaluationPrompt(candidateId, mandateId);
    if ("error" in res) {
      setCopying(false);
      setError(res.error);
      return;
    }
    try {
      await navigator.clipboard.writeText(res.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Kunde inte nå urklipp — kopiera manuellt från konsolen.");
      console.log(res.payload);
    }
    if (res.cvUrl) window.open(res.cvUrl, "_blank", "noopener,noreferrer");
    setCopying(false);
  }

  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
      <CardHeader className="pb-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              AI-utvärdering
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Ställ in branschkontext för rollen (sparas på uppdraget) och kör AI-utvärderingen
            mot kandidatens CV. Rapporten visas direkt och sparas.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                Målbransch
              </label>
              <Input value={targetSector} onChange={(e) => setTargetSector(e.target.value)} placeholder="t.ex. Fintech" className="text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                Angränsande branscher <span className="font-normal lowercase">(komma-separerat)</span>
              </label>
              <Input value={adjacent} onChange={(e) => setAdjacent(e.target.value)} placeholder="Bank, Försäkring, SaaS" className="text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                Överförbara kompetenser <span className="font-normal lowercase">(komma-separerat)</span>
              </label>
              <Textarea value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Riskanalys, Regelefterlevnad, API-integrationer" className="text-sm min-h-[60px]" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                Extra nyckelord <span className="font-normal lowercase">(komma-separerat)</span>
              </label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="PSD2, KYC" className="text-sm" />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex flex-col gap-2">
            <Button type="button" onClick={handleRun} disabled={running} className="gap-2 w-full">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {running ? "Kör utvärdering…" : "Kör AI-utvärdering"}
            </Button>

            {report && !running && (
              <Button type="button" variant="outline" onClick={() => setReportOpen(true)} className="gap-2 w-full">
                <FileText className="h-4 w-4" />
                Visa rapport{reportAt ? ` (${new Date(reportAt).toLocaleDateString("sv-SE")})` : ""}
              </Button>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleCopy} disabled={copying} className="gap-2 flex-1">
                {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Kopierad" : "Kopiera prompt"}
              </Button>
              <Button type="button" variant="outline" onClick={handleSave} disabled={saving} className="gap-2 flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? "Sparat" : "Spara"}
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed flex items-start gap-1.5">
            <Download className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            &quot;Kopiera prompt&quot; är ett manuellt alternativ — prompten kopieras och CV:t öppnas i ny flik att bifoga i ditt AI-verktyg.
          </p>
        </CardContent>
      )}

      <Dialog.Root open={reportOpen} onOpenChange={setReportOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-3xl max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <Dialog.Title className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500">
                <Sparkles className="h-4 w-4 text-brand-500" />
                AI-utvärderingsrapport
              </Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {report && <MarkdownReport markdown={report} />}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Card>
  );
}
