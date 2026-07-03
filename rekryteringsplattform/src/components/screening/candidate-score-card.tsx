"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import { getMatchLevel, type MatchTone } from "@/lib/screening/match-level";
import { AiTransparencyCard } from "./ai-transparency-card";

type ComplianceData = {
  model: string;
  promptHash: string;
  screenedAt: string;
  isDecisionSupport: boolean;
};

type ScreeningResult = {
  score: number;
  reasoning: string[];
  missingSkills?: string[];
};

interface CandidateScoreCardProps {
  applicationId: string;
  initialResult?: ScreeningResult | null;
  initialCompliance?: ComplianceData | null;
  candidateName?: string;
  className?: string;
  onAnalyzed?: (result: ScreeningResult) => void;
}

// Visual styling per tone token. The tier/label boundaries themselves live in the
// canonical getMatchLevel (75/85/95) so recruiter, admin and client never disagree.
const TONE_STYLES: Record<MatchTone, { ring: string; text: string; bg: string; badge: "success" | "danger" | "outline" }> = {
  success: { ring: "stroke-success-500", text: "text-success-700", bg: "from-success-50 to-white", badge: "success" },
  danger: { ring: "stroke-danger-500", text: "text-danger-700", bg: "from-danger-50 to-white", badge: "danger" },
  muted: { ring: "stroke-slate-400", text: "text-slate-500", bg: "from-slate-50 to-white", badge: "outline" },
};

function getScoreTone(score: number | null) {
  const level = getMatchLevel(score);
  return { ...TONE_STYLES[level.tone], label: level.labelKey };
}

export function CandidateScoreCard({
  applicationId,
  initialResult = null,
  initialCompliance = null,
  candidateName,
  className,
  onAnalyzed,
}: CandidateScoreCardProps) {
  const [result, setResult] = useState<ScreeningResult | null>(initialResult);
  const [compliance, setCompliance] = useState<ComplianceData | null>(initialCompliance);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTransparency, setShowTransparency] = useState(false);
  const { t } = useTranslations();

  const score = result?.score ?? 0;
  // Feed null (not the defaulted 0) when unanalyzed so the ring shows the neutral
  // "unscored" tone instead of the red Not-Recommended tone under the "Not analyzed" badge.
  const tone = getScoreTone(result ? score : null);
  const circumference = 2 * Math.PI * 40;
  const progress = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (progress / 100) * circumference;

  const bulletPoints = useMemo(() => (result?.reasoning || []).slice(0, 3), [result]);
  const missingSkills = useMemo(() => (result?.missingSkills || []).slice(0, 8), [result]);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || t("components.scoreCardScreenFailed"));
      }

      const nextResult: ScreeningResult = {
        score: Number(json?.screening?.score || 0),
        reasoning: Array.isArray(json?.screening?.reasoning) ? json.screening.reasoning : [],
        missingSkills: Array.isArray(json?.screening?.missingSkills) ? json.screening.missingSkills : [],
      };

      if (json?.compliance) {
        setCompliance(json.compliance);
      }

      setResult(nextResult);
      onAnalyzed?.(nextResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("components.scoreCardUnknownError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={cn("overflow-hidden border-slate-200", className)}>
      <CardContent className="p-0">
        <div className={cn("bg-gradient-to-b p-5", tone.bg)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-slate-500">AI Screening</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">
                {candidateName ? t("components.scoreCardMatchFor").replace("{name}", candidateName) : t("components.scoreCardCandidateMatch")}
              </h3>
            </div>
            {result ? <Badge variant={tone.badge}>{t(tone.label)}</Badge> : <Badge variant="outline">{t("components.scoreCardNotAnalyzed")}</Badge>}
          </div>

          <div className="mt-4 flex items-center gap-5">
            <div className="relative h-28 w-28 shrink-0">
              <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
                <circle cx="50" cy="50" r="40" strokeWidth="10" className="fill-none stroke-slate-200" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  strokeWidth="10"
                  strokeLinecap="round"
                  className={cn("fill-none transition-all duration-700", tone.ring)}
                  style={{ strokeDasharray: circumference, strokeDashoffset: dashOffset }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-2xl font-black leading-none", result ? tone.text : "text-slate-400")}>
                  {result ? Math.round(score) : "—"}
                </span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">/100</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-600">
                {result
                  ? t("components.scoreCardSavedNote")
                  : t("components.scoreCardRunNote")}
              </p>
              {result ? (
                <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={loading} className="mt-3 gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? t("components.scoreCardAnalyzing") : t("components.scoreCardReanalyze")}
                </Button>
              ) : (
                <Button onClick={handleAnalyze} disabled={loading} className="mt-3 gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? t("components.scoreCardAnalyzing") : t("components.scoreCardAnalyze")}
                </Button>
              )}
              {error ? <p className="mt-2 text-xs font-medium text-danger-600">{error}</p> : null}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-slate-500 mb-2">{t("components.scoreCardReasoning")}</p>
            {bulletPoints.length === 0 ? (
              <p className="text-sm text-slate-500">{t("components.scoreCardNoAnalysis")}</p>
            ) : (
              <ul className="space-y-2">
                {bulletPoints.map((point, idx) => (
                  <li key={`${idx}-${point}`} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {missingSkills.length > 0 ? (
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-slate-500 mb-2">{t("components.scoreCardMissingSkills")}</p>
              <div className="flex flex-wrap gap-2">
                {missingSkills.map((skill) => (
                  <Badge key={skill} variant="outline" className="rounded-md px-2 py-1 text-[11px]">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {/* Human-in-the-loop disclaimer */}
          {result && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 flex items-start gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <span className="font-bold">Decision support only.</span> This AI screening assists the recruiter
                but does not make hiring decisions. All candidate progression requires human approval.
              </p>
            </div>
          )}

          {/* Transparency report toggle */}
          {result && compliance && (
            <button
              type="button"
              onClick={() => setShowTransparency(!showTransparency)}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="h-3 w-3" />
              {showTransparency ? "Hide transparency report" : "View AI transparency report (EU AI Act)"}
            </button>
          )}
        </div>

        {/* Expandable transparency card */}
        {showTransparency && compliance && result && (
          <div className="px-5 pb-5">
            <AiTransparencyCard
              model={compliance.model}
              promptHash={compliance.promptHash}
              screenedAt={compliance.screenedAt}
              score={result.score}
              reasoning={result.reasoning}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
