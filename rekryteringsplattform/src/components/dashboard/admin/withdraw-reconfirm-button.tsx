"use client";

import { useState } from "react";
import { withdrawClientFeeReconfirm } from "@/lib/actions/admin";
import { useTranslations } from "@/i18n/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function WithdrawReconfirmButton({ jobId }: { jobId: string }) {
    const { t } = useTranslations();
    const [busy, setBusy] = useState(false);
    return (
        <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={async () => {
                setBusy(true);
                const r = await withdrawClientFeeReconfirm(jobId);
                setBusy(false);
                if (r?.error) toast.error(r.error);
                else toast.success("Withdrawn");
            }}
        >
            {t("feeReconfirm.adminWithdrawButton")}
        </Button>
    );
}
