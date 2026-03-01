"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppLogo } from "@/components/shared/app-logo";
import { Building2, UserCircle } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { useTranslations } from "@/i18n/client";

export default function LoginPage() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const titleKey = role === "company"
    ? "auth.loginCompanyTitle"
    : role === "recruiter"
      ? "auth.loginRecruiterTitle"
      : "auth.loginTitle";

  const descriptionKey = role === "company"
    ? "auth.loginCompanyDescription"
    : role === "recruiter"
      ? "auth.loginRecruiterDescription"
      : "auth.loginDescription";

  const RoleIcon = role === "company" ? Building2 : role === "recruiter" ? UserCircle : null;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
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
            <div className="flex items-center justify-center gap-2">
              {RoleIcon && <RoleIcon className={`h-5 w-5 ${role === "company" ? "text-brand-600" : "text-success-600"}`} />}
              <CardTitle>{t(titleKey)}</CardTitle>
            </div>
            <CardDescription>{t(descriptionKey)}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger-50 text-danger-700 text-sm">
                {error}
              </div>
            )}
            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.emailLabel")}</label>
                <Input type="email" name="email" placeholder={t("auth.emailPlaceholder")} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("auth.passwordLabel")}</label>
                <Input type="password" name="password" placeholder={t("auth.passwordPlaceholder")} required />
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  {t("auth.rememberMe")}
                </label>
                <Link href="/forgot-password" className="text-brand-600 hover:underline">{t("auth.forgotPassword")}</Link>
              </div>
              <Button className="w-full" size="lg" disabled={loading}>
                {loading ? t("auth.loggingIn") : t("auth.loginButton")}
              </Button>
            </form>

            {role && (
              <div className="mt-4 text-center">
                <Link
                  href={`/login?role=${role === "company" ? "recruiter" : "company"}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {role === "company" ? t("landing.loginRecruiter") : t("landing.loginCompany")}
                </Link>
              </div>
            )}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {t("auth.noAccountPrompt")}{" "}
              <Link href="/register" className="text-brand-600 hover:underline font-medium">
                {t("auth.registerLink")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
