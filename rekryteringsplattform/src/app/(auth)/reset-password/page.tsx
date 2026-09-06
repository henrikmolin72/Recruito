"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/shared/app-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "@/i18n/client";

export default function ResetPasswordPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setReady(true);
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(formData: FormData) {
    const password = (formData.get("password") as string) || "";
    const confirmPassword = (formData.get("confirm_password") as string) || "";

    setError(null);

    if (password.length < 10) {
      setError(t("auth.passwordMinLengthError"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatchError"));
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || t("auth.passwordUpdateFailedError"));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    await supabase.auth.signOut();

    setTimeout(() => {
      router.push("/login");
    }, 1200);
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
            <CardTitle>{t("auth.resetPasswordTitle")}</CardTitle>
            <CardDescription>{t("auth.resetPasswordDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <div className="space-y-4 text-sm">
                <div className="p-3 rounded-lg bg-warning-50 text-warning-700">
                  {t("auth.sessionNotFoundWarning")}
                </div>
                <Link href="/forgot-password" className="text-brand-600 hover:underline font-medium">
                  {t("auth.sendNewResetLink")}
                </Link>
              </div>
            ) : success ? (
              <div className="p-3 rounded-lg bg-success-50 text-success-700 text-sm">
                {t("auth.passwordUpdatedMessage")}
              </div>
            ) : (
              <form action={handleSubmit} className="space-y-4">
                {error ? <div className="p-3 rounded-lg bg-danger-50 text-danger-700 text-sm">{error}</div> : null}
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t("auth.newPasswordLabel")}</label>
                  <Input type="password" name="password" placeholder={t("auth.passwordMinPlaceholder")} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t("auth.confirmPasswordLabel")}</label>
                  <Input type="password" name="confirm_password" placeholder={t("auth.confirmPasswordPlaceholder")} required />
                </div>
                <Button className="w-full" size="lg" disabled={loading}>
                  {loading ? t("auth.savingPassword") : t("auth.updatePassword")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
