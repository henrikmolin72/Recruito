"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLogo } from "@/components/shared/app-logo";
import { registerCompany } from "@/lib/actions/auth";
import { useTranslations } from "@/i18n/client";

export default function RegisterCompanyPage() {
  const { t } = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await registerCompany(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <AppLogo size="md" priority />
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t("auth.registerCompanyTitle")}</CardTitle>
            <CardDescription>{t("auth.registerCompanyDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger-50 text-danger-700 text-sm">
                {error}
              </div>
            )}
            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.companyNameLabel")}</label>
                <Input name="company_name" placeholder={t("auth.companyNamePlaceholder")} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.orgNumberLabel")}</label>
                <Input name="org_number" placeholder={t("auth.orgNumberPlaceholder")} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.industryLabel")}</label>
                <Input name="industry" placeholder={t("auth.industryPlaceholder")} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.contactPersonLabel")}</label>
                <Input name="full_name" placeholder={t("auth.contactPersonPlaceholder")} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.emailLabel")}</label>
                <Input type="email" name="email" placeholder={t("auth.emailPlaceholder")} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.passwordLabel")}</label>
                <Input type="password" name="password" placeholder={t("auth.passwordMinPlaceholder")} required />
              </div>
              <Button className="w-full" size="lg" disabled={loading}>
                {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              {t("auth.alreadyRegistered")}{" "}
              <Link href="/login" className="text-brand-600 hover:underline font-medium">{t("auth.loginButton")}</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
