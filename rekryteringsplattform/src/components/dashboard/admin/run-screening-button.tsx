"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

// Mirrors the recruiter screening panel's error mapping so the admin sees the
// same human-readable reasons instead of raw API codes.
const RUN_ERRORS: Record<string, string> = {
  no_cv: "No CV is uploaded for this candidate.",
  unsupported_cv_format: "CV format not supported for automatic screening (PDF/TXT only).",
};

export function RunScreeningButton({
  candidateId,
  mandateId,
  hasReport,
}: {
  candidateId: string;
  mandateId: string;
  hasReport: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/screening-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, mandateId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(RUN_ERRORS[json?.error] || json?.error || "Screening failed. Please try again.");
        return;
      }
      // The report + score are persisted server-side; refresh to render them.
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button onClick={run} disabled={running} variant="outline" size="sm" className="gap-2 whitespace-nowrap">
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {running ? "Running…" : hasReport ? "Re-run AI screening" : "Run AI screening"}
      </Button>
      {error && <p className="max-w-xs text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
