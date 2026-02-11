"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle, TrendingUp, Users } from "lucide-react";

interface ExclusivityPromptProps {
  isExclusive: boolean;
  onChange: (value: boolean) => void;
}

export function ExclusivityPrompt({ isExclusive, onChange }: ExclusivityPromptProps) {
  return (
    <Card className={`border-2 transition-colors ${isExclusive ? "border-amber-400 bg-amber-50" : "border-gray-200"}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-amber-600" />
          2 veckors exklusivitet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Ge rekryterarna exklusiv tillgång i 2 veckor. Om du inte hittar rätt kandidat kan du utöka sökningen efteråt.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Hogre engagemang</p>
              <p className="text-xs text-muted-foreground">Rekryterare prioriterar exklusiva jobb</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Battre kandidater</p>
              <p className="text-xs text-muted-foreground">Fokuserad sokning ger kvalitativ matchning</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Snabbare tillsattning</p>
              <p className="text-xs text-muted-foreground">Genomsnittligt 30% snabbare</p>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isExclusive}
            onChange={(e) => onChange(e.target.checked)}
            className="h-5 w-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
          />
          <span className="text-sm font-medium">
            {isExclusive
              ? "Exklusivt pa Rekryto i 2 veckor"
              : "Aktivera 2 veckors exklusivitet"
            }
          </span>
        </label>
      </CardContent>
    </Card>
  );
}
