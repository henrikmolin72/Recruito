"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppLogo } from "@/components/shared/app-logo";
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
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">{t("common.logIn")}</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">{t("common.getStarted")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-14 md:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(37,99,235,0.14),transparent_40%)]" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-12 items-center">
            <div>
              <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {t("landing.heroBadge")}
              </span>

              <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-bold text-brand-900 leading-tight">
                {t("landing.heroTitleLine1")}
                <br />
                <span className="text-brand-600">– {t("landing.heroTitleLine2")}</span>
              </h1>

              <ul className="mt-6 space-y-3 max-w-xl">
                {[
                  { title: t("landing.heroBullet1Title"), desc: t("landing.heroBullet1Desc") },
                  { title: t("landing.heroBullet2Title"), desc: t("landing.heroBullet2Desc") },
                  { title: t("landing.heroBullet3Title"), desc: t("landing.heroBullet3Desc") },
                  { title: t("landing.heroBullet4Title"), desc: t("landing.heroBullet4Desc") },
                  { title: t("landing.heroBullet5Title"), desc: t("landing.heroBullet5Desc") },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-brand-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{item.title}:</span> {item.desc}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link href="/register/company">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
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

            <div className="relative">
              <div className="absolute -top-8 -right-8 h-44 w-44 rounded-full bg-brand-200/30 blur-3xl" />
              <div className="relative aspect-[3/2] overflow-hidden rounded-3xl border border-brand-100 shadow-[0_22px_50px_-22px_rgba(30,58,138,0.55)]">
                <Image
                  src="/images/recruito-hero-team.png"
                  alt={t("landing.heroImageAlt")}
                  width={1536}
                  height={1024}
                  priority
                  className="h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-900/30 via-transparent to-white/35" />
                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/90 backdrop-blur px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("landing.matchingLabel")}</p>
                    <p className="text-xs font-semibold text-foreground">{t("landing.matchingText")}</p>
                  </div>
                  <div className="rounded-lg bg-white/90 backdrop-blur px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("landing.safetyLabel")}</p>
                    <p className="text-xs font-semibold text-foreground">{t("landing.safetyText")}</p>
                  </div>
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
