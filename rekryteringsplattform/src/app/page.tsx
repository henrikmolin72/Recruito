"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppLogo } from "@/components/shared/app-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useTranslations } from "@/i18n/client";
import {
  Briefcase,
  Users,
  CheckCircle,
  Shield,
  TrendingDown,
  Clock,
  Star,
  Zap,
  ArrowRight,
  Building2,
  UserCircle,
  PlayCircle,
} from "lucide-react";

function getYouTubeEmbedUrl(url: string | undefined) {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        const id = parsed.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }

      if (parsed.pathname.startsWith("/embed/")) {
        const id = parsed.pathname.split("/").filter(Boolean)[1];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }

      if (parsed.pathname.startsWith("/shorts/")) {
        const id = parsed.pathname.split("/").filter(Boolean)[1];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export default function LandingPage() {
  const { t } = useTranslations();
  const demoEmbedUrl = getYouTubeEmbedUrl(process.env.NEXT_PUBLIC_LANDING_DEMO_YOUTUBE_URL);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <AppLogo size="sm" priority />
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground">{t("landing.navHowItWorks")}</a>
            <a href="#pricing" className="hover:text-foreground">{t("landing.navPricing")}</a>
            <a href="#companies" className="hover:text-foreground">{t("landing.navCompanies")}</a>
            <a href="#recruiters" className="hover:text-foreground">{t("landing.navRecruiters")}</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher variant="dropdown" compact />
            <Link href="/login?role=company">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex gap-1.5 bg-slate-800 text-white border-slate-800 hover:bg-slate-900 hover:text-white">
                <Building2 className="h-3.5 w-3.5" />
                {t("landing.loginCompany")}
              </Button>
            </Link>
            <Link href="/login?role=recruiter">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex gap-1.5">
                <UserCircle className="h-3.5 w-3.5" />
                {t("landing.loginRecruiter")}
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">{t("common.getStarted")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_20%,rgba(14,165,233,0.12),transparent),radial-gradient(ellipse_40%_40%_at_80%_80%,rgba(34,197,94,0.06),transparent),linear-gradient(to_bottom,#f8faff_0%,#ffffff_100%)]" />

        <div className="relative mx-auto max-w-6xl px-6">
          {/* Centered header content */}
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-white/80 px-4 py-1.5 text-sm font-semibold text-brand-700 shadow-sm">
              {t("landing.heroBadge")}
            </span>

            <h1 className="mt-6 text-[clamp(2.2rem,4.5vw,3.6rem)] font-black leading-[1.08] tracking-tight text-slate-950">
              {t("landing.heroTitleLine1")}{" "}
              <span className="text-brand-600">{t("landing.heroTitleLine2")}</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              {t("landing.heroDescription")}
            </p>
          </div>

          {/* Two-column layout: cards + CTAs left, image right */}
          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            {/* Left: value props + CTAs */}
            <div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
                    <Building2 className="h-4.5 w-4.5 text-brand-600" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{t("landing.navCompanies")}</p>
                  <p className="mt-1.5 text-sm leading-snug text-slate-700">{t("auth.companyOptionDescription")}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-success-50">
                    <UserCircle className="h-4.5 w-4.5 text-success-600" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{t("landing.navRecruiters")}</p>
                  <p className="mt-1.5 text-sm leading-snug text-slate-700">{t("auth.recruiterOptionDescription")}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/register/company">
                  <Button size="lg" className="w-full sm:w-auto gap-2 shadow-md shadow-brand-500/20">
                    <Building2 className="h-4 w-4" /> {t("landing.ctaCompanyButton")}
                  </Button>
                </Link>
                <Link href="/register/recruiter">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 border-success-500 text-success-700 hover:bg-success-50">
                    <UserCircle className="h-4 w-4" /> {t("landing.ctaRecruiterButton")}
                  </Button>
                </Link>
              </div>

              {/* Trust signals */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-success-500" />{t("landing.matchingText")}</span>
                <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-brand-500" />{t("landing.safetyText")}</span>
              </div>
            </div>

            {/* Right: hero image */}
            <div className="relative">
              <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-brand-200/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-success-200/25 blur-3xl" />
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
                <div className="aspect-[4/3]">
                  <Image
                    src="/images/recruito-hero-team.png"
                    alt={t("landing.heroImageAlt")}
                    width={1536}
                    height={1024}
                    priority
                    className="h-full w-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-white/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-muted">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">{t("landing.howItWorksTitle")}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Briefcase, title: t("landing.step1Title"), desc: t("landing.step1Desc") },
              { icon: Users, title: t("landing.step2Title"), desc: t("landing.step2Desc") },
              { icon: CheckCircle, title: t("landing.step3Title"), desc: t("landing.step3Desc") },
            ].map((step) => (
              <Card key={step.title} className="p-8 text-center">
                <div className="h-14 w-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-7 w-7 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits for companies */}
      <section id="companies" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">{t("landing.companyBenefitsTitle")}</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            {t("landing.companyBenefitsSubtitle")}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: TrendingDown, title: t("landing.benefit60Cheaper"), desc: t("landing.benefit60CheaperDesc") },
              { icon: Users, title: t("landing.benefitParallel"), desc: t("landing.benefitParallelDesc") },
              { icon: CheckCircle, title: t("landing.benefitPayOnSuccess"), desc: t("landing.benefitPayOnSuccessDesc") },
              { icon: Shield, title: t("landing.benefitGuarantee"), desc: t("landing.benefitGuaranteeDesc") },
            ].map((benefit) => (
              <div key={benefit.title} className="text-center p-6">
                <benefit.icon className="h-8 w-8 text-brand-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits for recruiters */}
      <section id="recruiters" className="py-20 bg-muted">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">{t("landing.recruiterBenefitsTitle")}</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            {t("landing.recruiterBenefitsSubtitle")}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Zap, title: t("landing.benefitMoreJobs"), desc: t("landing.benefitMoreJobsDesc") },
              { icon: Star, title: t("landing.benefit75Percent"), desc: t("landing.benefit75PercentDesc") },
              { icon: Clock, title: t("landing.benefitWorkFree"), desc: t("landing.benefitWorkFreeDesc") },
              { icon: TrendingDown, title: t("landing.benefitBuildReputation"), desc: t("landing.benefitBuildReputationDesc") },
            ].map((benefit) => (
              <div key={benefit.title} className="text-center p-6">
                <benefit.icon className="h-8 w-8 text-success-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo + CTA (replaces calculator) */}
      <section id="pricing" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">{t("landing.ctaTitle")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("landing.ctaSubtitle")}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_1.35fr]">
            <Card className="p-6 lg:p-8 border-slate-200 shadow-sm">
              <div className="space-y-5">
                <div className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
                  {t("landing.demoStartBadge")}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900">
                    {t("landing.demoStartTitle")}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {t("landing.demoStartDesc")}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {t("landing.demoStartBullet1")}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {t("landing.demoStartBullet2")}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {t("landing.demoStartBullet3")}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/register/company" className="w-full">
                    <Button size="lg" className="w-full gap-2">
                      <Building2 className="h-4 w-4" />
                      {t("landing.ctaCompanyButton")}
                    </Button>
                  </Link>
                  <Link href="/register/recruiter" className="w-full">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full gap-2 border-success-500 text-success-700 hover:bg-success-50"
                    >
                      <UserCircle className="h-4 w-4" />
                      {t("landing.ctaRecruiterButton")}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>

            <div className="grid gap-6 sm:grid-cols-2">
              <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="relative aspect-[4/3]">
                  <Image
                    src="/images/recruito-hero-team.png"
                    alt={t("landing.heroImageAlt")}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-slate-900 shadow">
                    Recruiter dashboard workflow
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <Image
                    src="/images/hero-bg.png"
                    alt="Recruito interface preview background"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-600/15 via-transparent to-success-500/15" />
                  <div className="absolute inset-x-3 bottom-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-slate-900 shadow">
                    Company overview &amp; candidate flow visibility
                  </div>
                </div>
              </Card>

              <Card className="sm:col-span-2 overflow-hidden border-slate-200 shadow-sm">
                <div className="relative aspect-video bg-[linear-gradient(135deg,#0f172a,#1e293b_45%,#0b1220)] p-5 sm:p-6">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(14,165,233,.16),transparent_40%),radial-gradient(circle_at_82%_75%,rgba(34,197,94,.16),transparent_42%)]" />
                  {demoEmbedUrl ? (
                    <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                      <iframe
                        src={demoEmbedUrl}
                        title="Recruito demo video"
                        className="h-full w-full"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="relative h-full rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm flex flex-col items-center justify-center text-center px-6">
                      <PlayCircle className="h-14 w-14 text-white/90 mb-3" />
                      <p className="text-white text-lg font-semibold">Demo video (YouTube)</p>
                      <p className="mt-2 text-sm text-slate-300 max-w-xl">
                        Placeholder for the product demo. Add your YouTube video here to showcase onboarding, candidate work, and the client flowchart view.
                      </p>
                      <div className="mt-4 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-slate-200">
                        Set `NEXT_PUBLIC_LANDING_DEMO_YOUTUBE_URL` in the environment
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-brand-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{t("landing.ctaTitle")}</h2>
          <p className="text-brand-200 mb-8 text-lg">
            {t("landing.ctaSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register/company">
              <Button size="lg" className="w-full sm:w-auto bg-white text-brand-600 hover:bg-brand-50 gap-2">
                {t("auth.registerCompanyButton")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register/recruiter">
              <Button size="lg" className="w-full sm:w-auto bg-success-500 text-white hover:bg-success-700 gap-2">
                {t("auth.becomeRecruiterButton")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <AppLogo size="sm" className="mb-4" />
              <p className="text-sm text-muted-foreground">
                {t("landing.footerDescription")}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">{t("landing.footerPlatform")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/#how-it-works" className="hover:text-foreground">{t("landing.navHowItWorks")}</Link></li>
                <li><Link href="/#pricing" className="hover:text-foreground">{t("landing.navPricing")}</Link></li>
                <li><a href="mailto:hello@recruito.se" className="hover:text-foreground">{t("landing.footerFaq")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">{t("landing.footerCompany")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/#companies" className="hover:text-foreground">{t("landing.footerAboutUs")}</Link></li>
                <li><a href="mailto:hello@recruito.se" className="hover:text-foreground">{t("landing.footerContact")}</a></li>
                <li><a href="mailto:hello@recruito.se" className="hover:text-foreground">{t("landing.footerBlog")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">{t("landing.footerLegal")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/anvandarvillkor" className="hover:text-foreground">{t("landing.footerTerms")}</Link></li>
                <li><Link href="/integritetspolicy" className="hover:text-foreground">{t("landing.footerPrivacy")}</Link></li>
                <li><Link href="/gdpr" className="hover:text-foreground">{t("landing.footerGdpr")}</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            {t("common.allRightsReserved")}
          </div>
        </div>
      </footer>
    </div>
  );
}
