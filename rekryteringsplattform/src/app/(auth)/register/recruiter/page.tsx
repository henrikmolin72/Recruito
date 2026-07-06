"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Globe, Handshake, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AppLogo } from "@/components/shared/app-logo";
import { registerRecruiter } from "@/lib/actions/auth";
import { useTranslations } from "@/i18n/client";
import { COUNTRY_OPTIONS, EXPERIENCE_BRACKET_OPTIONS, HOW_HEARD_OPTIONS } from "@/lib/recruiter-onboarding-options";

export default function RegisterRecruiterPage() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const submitted = searchParams.get("submitted") === "1";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (submitted) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_20%_15%,#dcfce7,transparent_38%),radial-gradient(circle_at_85%_15%,#dbeafe,transparent_40%),linear-gradient(180deg,#f8fafc,#ffffff)] px-4 py-10 flex items-center justify-center">
        <Card className="max-w-lg w-full border-slate-200 shadow-2xl shadow-slate-200/70">
          <CardContent className="p-10 text-center space-y-5">
            <Link href="/" className="inline-flex items-center gap-2">
              <AppLogo size="md" priority />
            </Link>
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{t("auth.recruiterThankYouTitle")}</h1>
            <p className="text-sm leading-6 text-slate-600">
              {t("auth.recruiterThankYouBody")}
            </p>
            <Link href="/" className="inline-block">
              <Button variant="outline">{t("auth.backToHome")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_15%,#dcfce7,transparent_38%),radial-gradient(circle_at_85%_15%,#dbeafe,transparent_40%),linear-gradient(180deg,#f8fafc,#ffffff)] px-4 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <AppLogo size="md" priority />
          </Link>
        </div>

        <Card className="overflow-hidden border-slate-200 shadow-2xl shadow-slate-200/70">
          <div className="grid lg:grid-cols-[1.05fr_1.35fr]">
            <div className="bg-slate-900 px-8 py-10 text-white lg:px-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
                <Sparkles className="h-3.5 w-3.5" />
                {t("auth.recruiterRegBadge")}
              </div>

              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight">
                {t("auth.recruiterRegHeadline")}
              </h1>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Globe className="h-4 w-4 text-emerald-300" />
                    {t("auth.recruiterRegFeature1Title")}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {t("auth.recruiterRegFeature1Desc")}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Handshake className="h-4 w-4 text-sky-300" />
                    {t("auth.recruiterRegFeature2Title")}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {t("auth.recruiterRegFeature2Desc")}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-amber-300" />
                    {t("auth.recruiterRegFeature3Title")}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {t("auth.recruiterRegFeature3Desc")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 lg:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">{t("auth.registerRecruiterTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("auth.registerRecruiterDescription")}</p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
                  {error}
                </div>
              )}

              <form action={handleSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium">Full Name</label>
                    <Input name="full_name" placeholder="Jane Doe" required />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Email</label>
                    <Input type="email" name="email" placeholder="jane@example.com" required />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Password</label>
                    <Input type="password" name="password" placeholder={t("auth.passwordMinPlaceholder")} required />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Current Country</label>
                    <select
                      name="current_country"
                      required
                      defaultValue=""
                      className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1"
                    >
                      <option value="" disabled>Select country</option>
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Years of Recruiting Experience</label>
                    <select
                      name="years_experience_bracket"
                      required
                      defaultValue=""
                      className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1"
                    >
                      <option value="" disabled>Select range</option>
                      {EXPERIENCE_BRACKET_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium">LinkedIn Profile</label>
                    <Input name="linkedin_url" placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium">How did you hear about us?</label>
                    <select
                      name="how_heard"
                      required
                      defaultValue=""
                      className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1"
                    >
                      <option value="" disabled>Select an option</option>
                      {HOW_HEARD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-semibold">Agreement</p>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 text-sm leading-5">
                      <input type="checkbox" name="agreement_freelance_recruiter" className="mt-1 h-4 w-4 rounded border-slate-300" required />
                      <span>I agree to join the platform as a freelance recruiter.</span>
                    </label>
                    <label className="flex items-start gap-3 text-sm leading-5">
                      <input type="checkbox" name="agreement_commission_after_guarantee" className="mt-1 h-4 w-4 rounded border-slate-300" required />
                      <span>I understand that commission is paid only after the successful completion of the candidate’s guarantee period.</span>
                    </label>
                  </div>
                </div>

                <Button className="w-full bg-success-500 hover:bg-success-700" size="lg" disabled={loading}>
                  {loading ? t("auth.sendingApplication") : t("auth.sendApplication")}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {t("auth.applicationReviewNotice")}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
