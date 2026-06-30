"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles, FileText, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { StoredEvaluation } from "@/lib/actions/screening";
import { MarkdownReport } from "./markdown-report";

type Props = {
  report: StoredEvaluation | null;
  dict: Record<string, string>;
};

// Read-only view of the latest AI screening report for a candidate. Running and
// sector-config editing live elsewhere now (pre-submission self-check + the
// assignment-level config panel); on the candidate page the recruiter only views
// the stored report — a self-check the client never sees.
export function ScreeningReportCard({ report, dict: r }: Props) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
      <CardHeader className="pb-2">
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {r.aiEvalTitle || "AI evaluation"}
          </span>
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-500 leading-relaxed">
          {r.aiEvalReadonlyIntro ||
            "Recruiter-only fit check from the AI screening — the client never sees this."}
        </p>
        {report ? (
          <Button type="button" variant="outline" onClick={() => setReportOpen(true)} className="gap-2 w-full">
            <FileText className="h-4 w-4" />
            {r.aiEvalShowReport || "Show report"}
            {report.createdAt ? ` (${new Date(report.createdAt).toLocaleDateString()})` : ""}
          </Button>
        ) : (
          <p className="text-xs text-slate-400 italic">{r.aiEvalNoReport || "No AI fit report yet."}</p>
        )}
      </CardContent>

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
              {report && <MarkdownReport markdown={report.reportMarkdown} />}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Card>
  );
}
