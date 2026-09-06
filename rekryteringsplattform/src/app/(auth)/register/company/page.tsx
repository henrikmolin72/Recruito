"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLogo } from "@/components/shared/app-logo";
import { registerCompany } from "@/lib/actions/auth";
import { useTranslations } from "@/i18n/client";
import { HOW_HEARD_OPTIONS } from "@/lib/recruiter-onboarding-options";
import { INDUSTRY_OPTIONS } from "@/lib/job-form-options";

export default function RegisterCompanyPage() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const submitted = searchParams.get("submitted") === "1";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-10 text-center space-y-5">
            <Link href="/" className="inline-flex items-center gap-2">
              <AppLogo size="md" priority />
            </Link>
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{t("auth.companyThankYouTitle")}</h1>
            <p className="text-sm leading-6 text-slate-600">{t("auth.companyThankYouBody")}</p>
            <Link href="/login" className="inline-block">
              <Button variant="outline">{t("auth.loginButton")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(new FormData(e.currentTarget)); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.companyNameLabel")}</label>
                <Input name="company_name" placeholder={t("auth.companyNamePlaceholder")} required minLength={2} maxLength={120} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.howHeardLabel")}</label>
                <select
                  name="how_heard"
                  required
                  defaultValue=""
                  className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1"
                >
                  <option value="" disabled>{t("auth.howHeardPlaceholder")}</option>
                  {HOW_HEARD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.industryLabel")}</label>
                <select
                  name="industry"
                  required
                  defaultValue=""
                  className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1"
                >
                  <option value="" disabled>{t("auth.industryPlaceholder")}</option>
                  {INDUSTRY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.contactPersonLabel")}</label>
                <Input name="full_name" placeholder={t("auth.contactPersonPlaceholder")} required minLength={2} maxLength={100} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.emailLabel")}</label>
                <Input type="email" name="email" placeholder={t("auth.emailPlaceholder")} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.passwordLabel")}</label>
                <Input type="password" name="password" placeholder={t("auth.passwordMinPlaceholder")} required minLength={10} />
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
