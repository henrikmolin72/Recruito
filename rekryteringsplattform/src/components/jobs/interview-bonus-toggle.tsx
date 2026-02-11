"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Eye, EyeOff } from "lucide-react";

interface InterviewBonusToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
}

export function InterviewBonusToggle({ enabled, onChange }: InterviewBonusToggleProps) {
  return (
    <Card className={`border-2 transition-colors ${enabled ? "border-emerald-400 bg-emerald-50" : "border-gray-200"}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="h-5 w-5 text-emerald-600" />
          Intervjubonus för rekryterare
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Motivera rekryterare att presentera toppkandidater genom att erbjuda bonus vid intervju.
          Bonusen betalas ut av plattformen och dras inte från företagets avgift.
        </p>
        <div className="rounded-md bg-white p-3 border text-sm space-y-1">
          <p><span className="font-medium">50 EUR</span> — när kandidat kallas till första intervjun</p>
          <p><span className="font-medium">100 EUR</span> — när kandidat kallas till slutintervju</p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChange(e.target.checked)}
            className="h-5 w-5 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="flex items-center gap-2 text-sm font-medium">
            {enabled ? (
              <>
                <Eye className="h-4 w-4 text-emerald-600" />
                Synlig för rekryterare — bonusincentiv visas på jobbannonsen
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 text-muted-foreground" />
                Dold — bonus skapas men visas inte för rekryterare
              </>
            )}
          </span>
        </label>

        <p className="text-xs text-muted-foreground">
          Oavsett inställning skapas bonus automatiskt när en kandidat når intervjustadiet.
          Denna inställning styr enbart om rekryterare ser bonusen som incentiv på jobbannonsen.
        </p>
      </CardContent>
    </Card>
  );
}
