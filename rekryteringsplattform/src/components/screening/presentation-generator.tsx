"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Sparkles, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/i18n/client";

// Replaced the batch Top-5 ShortlistGenerator 2026-07-10: recruiters present
// one candidate at a time, so the pitch is generated per candidate row.
type PresentationResponse = {
  ok: true;
  candidateId: string;
  title: string;
  pitch: string;
  score: number | null;
  shareText: string;
};

interface PresentationGeneratorProps {
  candidateId: string;
  candidateName: string;
}

export function PresentationGenerator({ candidateId, candidateName }: PresentationGeneratorProps) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<PresentationResponse | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setCopied(false);
    setOpen(true);

    try {
      const response = await fetch("/api/candidate-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || t("components.shortlistGenError"));
      }
      setData(json as PresentationResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("components.scoreCardUnknownError"));
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!data?.shareText) return;
    try {
      await navigator.clipboard.writeText(data.shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(t("components.shortlistCopyError"));
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" variant="outline" onClick={generate} disabled={loading} className="gap-1.5">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {loading ? t("components.shortlistGenerating") : t("components.shortlistGenerate")}
      </Button>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2">
          <Card className="overflow-hidden border-none shadow-2xl shadow-slate-900/20">
            <div className="border-b border-slate-100 bg-white px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-bold text-slate-900">
                  {data?.title || `${candidateName} — ${t("components.shortlistTitle")}`}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-500">
                  {t("components.shortlistSubtitle")}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label={t("components.shortlistClose")}
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <CardContent className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {loading ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />
                  <p className="mt-3 text-sm font-medium text-slate-700">{t("components.shortlistCompiling")}</p>
                  <p className="text-xs text-slate-500 mt-1">{t("components.shortlistLowCost")}</p>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div>
              ) : data ? (
                <>
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{candidateName}</p>
                      {typeof data.score === "number" ? (
                        <Badge variant={data.score > 70 ? "success" : data.score >= 40 ? "warning" : "danger"}>
                          {Math.round(data.score)}/100
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700 whitespace-pre-wrap">{data.pitch}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Share text</p>
                      <Button type="button" size="sm" variant="outline" onClick={copyToClipboard} className="gap-2">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? t("components.shortlistCopied") : t("components.shortlistCopyClipboard")}
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700 font-sans">{data.shareText}</pre>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-600">
                  {t("components.shortlistEmpty")}
                </div>
              )}
            </CardContent>
          </Card>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
