"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppLogo } from "@/components/shared/app-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { formatCurrency, calculateFee } from "@/lib/utils";
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
} from "lucide-react";

export default function LandingPage() {
  const { t } = useTranslations();
  const [salary, setSalary] = useState(600000);
  const fees = calculateFee(salary);
  const traditionalFee = salary * 0.25;

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
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">{t("common.logIn")}</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">{t("common.getStarted")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(14,165,233,0.22),transparent_38%),radial-gradient(circle_at_88%_22%,rgba(59,130,246,0.16),transparent_34%),linear-gradient(to_bottom,#f7fbff_0%,#f8fafc_70%,#ffffff_100%)]" />
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-200/70 to-transparent" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <span className="inline-flex items-center rounded-full border border-brand-200/80 bg-white/80 px-4 py-1.5 text-sm font-semibold text-brand-700 backdrop-blur">
              {t("landing.heroBadge")}
            </span>

            <h1 className="mt-6 max-w-3xl text-[clamp(2.8rem,5vw,5.2rem)] font-black leading-[0.95] tracking-tight text-slate-950">
              {t("landing.heroTitleLine1")}
              <span className="mt-3 block text-brand-700">{t("landing.heroTitleLine2")}</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              {t("landing.heroDescription")}
            </p>

            <ul className="mt-8 grid max-w-2xl gap-3.5">
              {[
                { title: t("landing.heroBullet1Title"), desc: t("landing.heroBullet1Desc") },
                { title: t("landing.heroBullet2Title"), desc: t("landing.heroBullet2Desc") },
                { title: t("landing.heroBullet3Title"), desc: t("landing.heroBullet3Desc") },
                { title: t("landing.heroBullet4Title"), desc: t("landing.heroBullet4Desc") },
                { title: t("landing.heroBullet5Title"), desc: t("landing.heroBullet5Desc") },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <CheckCircle className="h-4 w-4" />
                  </span>
                  <p className="text-[15px] leading-relaxed text-slate-600 md:text-base">
                    <span className="font-semibold text-slate-900">{item.title}:</span> {item.desc}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col sm:flex-row gap-4">
              <Link href="/register/company">
                <Button size="lg" className="w-full sm:w-auto gap-2 shadow-sm">
                  <Building2 className="h-5 w-5" /> {t("landing.ctaCompanyButton")}
                </Button>
              </Link>
              <Link href="/register/recruiter">
                <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 border-success-500 text-success-700 hover:bg-success-50">
                  <UserCircle className="h-5 w-5" /> {t("landing.ctaRecruiterButton")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative lg:pl-4">
            <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-brand-300/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-8 h-44 w-44 rounded-full bg-cyan-200/35 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_28px_70px_-24px_rgba(15,23,42,0.45)]">
              <div className="aspect-[16/11]">
                <Image
                  src="/images/recruito-hero-team.png"
                  alt={t("landing.heroImageAlt")}
                  width={1536}
                  height={1024}
                  priority
                  className="h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/35 via-transparent to-white/35" />
              </div>
              <div className="absolute inset-x-5 bottom-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl bg-white/92 px-3.5 py-2.5 backdrop-blur">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{t("landing.matchingLabel")}</p>
                  <p className="text-sm font-semibold text-slate-900">{t("landing.matchingText")}</p>
                </div>
                <div className="rounded-xl bg-white/92 px-3.5 py-2.5 backdrop-blur">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{t("landing.safetyLabel")}</p>
                  <p className="text-sm font-semibold text-slate-900">{t("landing.safetyText")}</p>
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

      {/* Calculator */}
      <section id="pricing" className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">{t("landing.calculatorTitle")}</h2>
          <p className="text-center text-muted-foreground mb-10">
            {t("landing.calculatorSubtitle")}
          </p>
          <Card className="p-8">
            <label className="block text-sm font-medium mb-2">{t("landing.salaryLabel")}</label>
            <Input
              type="range"
              min={300000}
              max={1500000}
              step={50000}
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              className="w-full h-2 cursor-pointer"
            />
            <p className="text-center text-2xl font-bold mt-2 text-brand-600">
              {formatCurrency(salary)}
            </p>

            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="p-4 bg-danger-50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">{t("landing.traditionalAgency")}</p>
                <p className="text-2xl font-bold text-danger-700 mt-1">{formatCurrency(traditionalFee)}</p>
              </div>
              <div className="p-4 bg-success-50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">{t("landing.recruitoFrom12")}</p>
                <p className="text-2xl font-bold text-success-700 mt-1">{formatCurrency(salary * 0.12)} – {formatCurrency(fees.totalFee)}</p>
                <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                  <p>{t("landing.tier02Placements")}</p>
                  <p>{t("landing.tier3Placements")}</p>
                  <p>{t("landing.tier5Placements")}</p>
                </div>
              </div>
            </div>

            <div className="text-center mt-6 p-4 bg-brand-50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t("landing.companySaves")}</p>
              <p className="text-3xl font-bold text-brand-600">
                {formatCurrency(traditionalFee - fees.totalFee)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("landing.recruiterEarns").replace("{amount}", formatCurrency(fees.recruiterFee))}
              </p>
            </div>
          </Card>
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
                <li><a href="/#how-it-works" className="hover:text-foreground">{t("landing.navHowItWorks")}</a></li>
                <li><a href="/#pricing" className="hover:text-foreground">{t("landing.navPricing")}</a></li>
                <li><a href="mailto:hello@recruito.se" className="hover:text-foreground">{t("landing.footerFaq")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">{t("landing.footerCompany")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/#companies" className="hover:text-foreground">{t("landing.footerAboutUs")}</a></li>
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
