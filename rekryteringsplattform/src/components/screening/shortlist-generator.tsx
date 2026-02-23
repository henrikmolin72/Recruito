"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Sparkles, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ShortlistItem = {
  rank: number;
  candidateName: string;
  score?: number;
  pitch: string;
};

type ShortlistResponse = {
  ok: true;
  jobId: string;
  title: string;
  items: ShortlistItem[];
  shareText: string;
};

interface ShortlistGeneratorProps {
  jobId: string;
}

export function ShortlistGenerator({ jobId }: ShortlistGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<ShortlistResponse | null>(null);

  const hasData = !!data && data.items.length > 0;
  const shareText = useMemo(() => data?.shareText || "", [data]);

  async function generate() {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch("/api/generate-shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || "Kunde inte generera shortlist");
      }
      setData(json as ShortlistResponse);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Okänt fel");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!shareText) return;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Kunde inte kopiera till urklipp");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div className="flex flex-col items-end gap-2">
        <Button onClick={generate} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Genererar..." : "✨ Generera Topp-5 Presentation"}
        </Button>
        {error && !open ? <p className="text-xs text-danger-600 font-medium">{error}</p> : null}
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2">
          <Card className="overflow-hidden border-none shadow-2xl shadow-slate-900/20">
            <div className="border-b border-slate-100 bg-white px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-bold text-slate-900">
                  {data?.title || "Topp-5 presentation"}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-500">
                  Klar att dela med kund via mejl eller Slack.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label="Stäng"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <CardContent className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {loading ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />
                  <p className="mt-3 text-sm font-medium text-slate-700">AI sammanställer toppkandidaterna...</p>
                  <p className="text-xs text-slate-500 mt-1">Detta använder redan sparad screening-data för låg kostnad.</p>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div>
              ) : hasData ? (
                <>
                  <div className="space-y-3">
                    {data.items.map((item) => (
                      <div key={`${item.rank}-${item.candidateName}`} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="blue">#{item.rank}</Badge>
                          <p className="font-semibold text-slate-900">{item.candidateName}</p>
                          {typeof item.score === "number" ? (
                            <Badge variant={item.score > 70 ? "success" : item.score >= 40 ? "warning" : "danger"}>
                              {Math.round(item.score)}/100
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-700 whitespace-pre-wrap">{item.pitch}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Share text</p>
                      <Button type="button" size="sm" variant="outline" onClick={copyToClipboard} className="gap-2">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Kopierad" : "Kopiera till urklipp"}
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700 font-sans">{shareText}</pre>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-600">
                  Ingen shortlist genererad ännu.
                </div>
              )}
            </CardContent>
          </Card>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
