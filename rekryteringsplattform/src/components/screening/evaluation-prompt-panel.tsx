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
  dict: Record<string, string>;
};

const splitList = (v: string): string[] =>
  v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);

export function EvaluationPromptPanel({ candidateId, mandateId, initialConfig, initialReport, dict: r }: Props) {
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

  const runErrors: Record<string, string> = {
    no_cv: r.aiEvalErrNoCv || "No CV is uploaded for the candidate.",
    unsupported_cv_format:
      r.aiEvalErrUnsupportedCv ||
      "The CV format isn't supported for automatic runs (PDF/TXT only). Use the Copy button instead.",
  };

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
        setError(runErrors[json?.error] || json?.error || r.aiEvalErrFailed || "The evaluation failed.");
        return;
      }
      setReport(json.reportMarkdown);
      setReportAt(json.createdAt);
      setReportOpen(true);
    } catch {
      setError(r.aiEvalErrNetwork || "Network error — please try again.");
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
      setError(r.aiEvalErrClipboard || "Couldn't reach the clipboard — copy manually from the console.");
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
              {r.aiEvalTitle || "AI evaluation"}
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            {r.aiEvalIntro ||
              "Set the role's sector context (saved on the assignment) and run the AI evaluation against the candidate's CV. The report appears immediately and is saved."}
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

          <div className="flex flex-col gap-2">
            <Button type="button" onClick={handleRun} disabled={running} className="gap-2 w-full">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {running ? (r.aiEvalRunning || "Running evaluation…") : (r.aiEvalRun || "Run AI evaluation")}
            </Button>

            {report && !running && (
              <Button type="button" variant="outline" onClick={() => setReportOpen(true)} className="gap-2 w-full">
                <FileText className="h-4 w-4" />
                {r.aiEvalShowReport || "Show report"}{reportAt ? ` (${new Date(reportAt).toLocaleDateString()})` : ""}
              </Button>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleCopy} disabled={copying} className="gap-2 flex-1">
                {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? (r.aiEvalCopied || "Copied") : (r.aiEvalCopyPrompt || "Copy prompt")}
              </Button>
              <Button type="button" variant="outline" onClick={handleSave} disabled={saving} className="gap-2 flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? (r.aiEvalSaved || "Saved") : (r.aiEvalSave || "Save")}
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed flex items-start gap-1.5">
            <Download className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {r.aiEvalCopyHint ||
              "\"Copy prompt\" is a manual alternative — the prompt is copied and the CV opens in a new tab to attach in your AI tool."}
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
                {r.aiEvalReportTitle || "AI evaluation report"}
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
