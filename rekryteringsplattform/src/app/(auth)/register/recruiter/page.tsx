"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLogo } from "@/components/shared/app-logo";
import { registerRecruiter } from "@/lib/actions/auth";
import { useTranslations } from "@/i18n/client";

export default function RegisterRecruiterPage() {
  const { t } = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await registerRecruiter(formData);
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
            <CardTitle>{t("auth.registerRecruiterTitle")}</CardTitle>
            <CardDescription>{t("auth.registerRecruiterDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger-50 text-danger-700 text-sm">
                {error}
              </div>
            )}
            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.fullNameLabel")}</label>
                <Input name="full_name" placeholder={t("auth.contactPersonPlaceholder")} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.emailLabel")}</label>
                <Input type="email" name="email" placeholder={t("auth.emailPlaceholder")} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.headlineLabel")}</label>
                <Input name="headline" placeholder={t("auth.headlinePlaceholder")} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.linkedinLabel")}</label>
                <Input name="linkedin_url" placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.yearsExperienceLabel")}</label>
                <Input type="number" name="years_experience" placeholder="5" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.passwordLabel")}</label>
                <Input type="password" name="password" placeholder={t("auth.passwordMinPlaceholder")} required />
              </div>
              <Button className="w-full bg-success-500 hover:bg-success-700" size="lg" disabled={loading}>
                {loading ? t("auth.sendingApplication") : t("auth.sendApplication")}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              {t("auth.applicationReviewNotice")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
