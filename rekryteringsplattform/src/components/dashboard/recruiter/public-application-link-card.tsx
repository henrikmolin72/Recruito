"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Copy, ExternalLink, Info, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/i18n/client";

type PublicApplicationLinkCardProps = {
  url: string;
  submittedCount?: number;
  maxSubmissions?: number;
};

export function PublicApplicationLinkCard({ url, submittedCount = 0, maxSubmissions = 7 }: PublicApplicationLinkCardProps) {
  const { t } = useTranslations();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const remaining = maxSubmissions - submittedCount;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5" />
            {t("recruiter.publicLinkLabel")}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{t("recruiter.publicLinkTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("recruiter.publicLinkIntro")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={url} readOnly className="font-mono text-xs" />
          <Button type="button" variant="outline" onClick={handleCopy} className="gap-2 shrink-0">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("recruiter.publicLinkCopied") : t("recruiter.publicLinkCopy")}
          </Button>
          <Button asChild type="button" variant="outline" className="gap-2 shrink-0">
            <Link href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              {t("recruiter.publicLinkOpen")}
            </Link>
          </Button>
        </div>

        {/* Submission counter */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-700">
            {t("recruiter.publicLinkCounter").replace("{sent}", String(submittedCount)).replace("{max}", String(maxSubmissions))}
          </span>
          {remaining <= 2 && remaining > 0 ? (
            <span className="text-amber-600 text-xs font-medium">{t("recruiter.publicLinkRemaining").replace("{n}", String(remaining))}</span>
          ) : null}
          {remaining <= 0 ? (
            <span className="text-danger-600 text-xs font-medium">{t("recruiter.publicLinkMaxReached")}</span>
          ) : null}
        </div>

        {/* Instructions */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs leading-5 text-blue-900 space-y-1.5">
              <p className="font-semibold">{t("recruiter.publicLinkHowToTitle")}</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>{t("recruiter.publicLinkStep1")}</li>
                <li>{t("recruiter.publicLinkStep2")}</li>
                <li>{t("recruiter.publicLinkStep3")}</li>
              </ol>
              <p className="text-blue-700 mt-1">
                {t("recruiter.publicLinkMaxNote").replace("{max}", String(maxSubmissions))}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs leading-5 text-amber-800">
            <strong>{t("recruiter.publicLinkImportantLabel")}</strong> {t("recruiter.publicLinkImportantBody")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
