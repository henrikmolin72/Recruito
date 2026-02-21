"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppLogo } from "@/components/shared/app-logo";
import { Building2, UserCircle, ArrowRight } from "lucide-react";
import { useTranslations } from "@/i18n/client";

export default function RegisterPage() {
  const { t } = useTranslations();

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <AppLogo size="md" priority />
          </Link>
          <h1 className="text-2xl font-bold mt-6">{t("auth.chooseAccountType")}</h1>
          <p className="text-muted-foreground mt-2">{t("auth.howToUseRecruitoPrompt")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:border-brand-600 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-brand-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{t("auth.companyOption")}</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {t("auth.companyOptionDescription")}
              </p>
              <Link href="/register/company">
                <Button className="w-full gap-2">
                  {t("auth.registerCompanyButton")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:border-success-500 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-4">
                <UserCircle className="h-8 w-8 text-success-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{t("auth.recruiterOption")}</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {t("auth.recruiterOptionDescription")}
              </p>
              <Link href="/register/recruiter">
                <Button className="w-full gap-2 bg-success-500 hover:bg-success-700">
                  {t("auth.becomeRecruiterButton")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {t("auth.alreadyMember")}{" "}
          <Link href="/login" className="text-brand-600 hover:underline font-medium">
            {t("common.logIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
