"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toggleCompanyVerification, verifyCompanyOrgNumber } from "@/lib/actions/admin";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/client";
import { ShieldCheck, ShieldX, Search } from "lucide-react";

interface CompanyVerificationActionsProps {
    companyId: string;
    isVerified: boolean;
    orgNumber: string;
}

export function CompanyVerificationActions({ companyId, isVerified, orgNumber }: CompanyVerificationActionsProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [orgCheckResult, setOrgCheckResult] = useState<{ valid: boolean; error?: string } | null>(null);
    const router = useRouter();
    const { t } = useTranslations();

    const handleToggleVerification = async () => {
        setLoading("verify");
        const result = await toggleCompanyVerification(companyId, !isVerified);
        if (result.error) {
            alert(t("common.error") + ": " + result.error);
        }
        router.refresh();
        setLoading(null);
    };

    const handleCheckOrgNumber = async () => {
        setLoading("check");
        const result = await verifyCompanyOrgNumber(companyId);
        setOrgCheckResult(result);
        setLoading(null);
    };

    return (
        <div className="flex items-center gap-2">
            {isVerified ? (
                <Badge variant="success" className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {t("admin.verifiedBadge")}
                </Badge>
            ) : (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <ShieldX className="h-3 w-3" />
                    {t("admin.unverifiedBadge")}
                </Badge>
            )}
            <div className="flex gap-1">
                <Button
                    size="sm"
                    variant={isVerified ? "outline" : "default"}
                    className="h-7 text-xs"
                    onClick={handleToggleVerification}
                    disabled={loading !== null}
                >
                    {loading === "verify" ? "..." : isVerified ? t("admin.unverifyCompany") : t("admin.verifyCompany")}
                </Button>
                {orgNumber && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleCheckOrgNumber}
                        disabled={loading !== null}
                        title={t("admin.verifyOrgNumber")}
                    >
                        {loading === "check" ? "..." : <Search className="h-3 w-3" />}
                    </Button>
                )}
            </div>
            {orgCheckResult && (
                <span className={`text-[10px] font-medium ${orgCheckResult.valid ? "text-success-600" : "text-danger-500"}`}>
                    {orgCheckResult.valid ? t("admin.orgNumberValid") : t("admin.orgNumberInvalid")}
                </span>
            )}
        </div>
    );
}

export function VerifiedBadge({ isVerified }: { isVerified: boolean }) {
    const { t } = useTranslations();

    if (!isVerified) return null;

    return (
        <Badge variant="success" className="gap-1 ml-2">
            <ShieldCheck className="h-3 w-3" />
            {t("admin.verifiedBadge")}
        </Badge>
    );
}
