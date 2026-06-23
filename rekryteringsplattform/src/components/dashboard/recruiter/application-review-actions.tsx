"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/client";

type ApplicationReviewActionsProps = {
  applicationId: string;
  status: string;
  remainingSlots: number;
};

async function callReviewAction(applicationId: string, action: "approve" | "reject") {
  const res = await fetch("/api/applications/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicationId, action }),
  });
  return res.json();
}

export function ApplicationReviewActions({
  applicationId,
  status,
  remainingSlots,
}: ApplicationReviewActionsProps) {
  const router = useRouter();
  const { t } = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [currentAction, setCurrentAction] = useState<"approve" | "reject" | null>(null);

  if (status === "submitted_to_client") {
    return <Badge variant="success" className="gap-1"><Check className="h-3 w-3" /> {t("recruiter.appReviewSentToClient")}</Badge>;
  }

  if (status === "recruiter_rejected") {
    return <Badge variant="danger" className="gap-1"><X className="h-3 w-3" /> {t("recruiter.appReviewRejected")}</Badge>;
  }

  async function handleAction(action: "approve" | "reject") {
    setCurrentAction(action);
    startTransition(async () => {
      const result = await callReviewAction(applicationId, action);
      if (result.success) {
        toast.success(action === "approve" ? t("recruiter.appReviewSentToast") : t("recruiter.appReviewRejectedToast"));
        router.refresh();
      } else {
        toast.error(result.error || t("recruiter.appReviewError"));
      }
      setCurrentAction(null);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-success-700 border-success-200 hover:bg-success-50"
        disabled={isPending || remainingSlots <= 0}
        onClick={() => handleAction("approve")}
      >
        {isPending && currentAction === "approve" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
        {t("recruiter.appReviewSendToClient")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-danger-700 border-danger-200 hover:bg-danger-50"
        disabled={isPending}
        onClick={() => handleAction("reject")}
      >
        {isPending && currentAction === "reject" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
        {t("recruiter.appReviewReject")}
      </Button>
      {remainingSlots <= 0 ? (
        <span className="text-xs text-danger-600">{t("recruiter.appReviewMaxReached")}</span>
      ) : null}
    </div>
  );
}
