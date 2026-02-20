"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppLogo } from "@/components/shared/app-logo";
import { formatCurrency, calculateFee } from "@/lib/utils";
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
            <a href="#how-it-works" className="hover:text-foreground">Så fungerar det</a>
            <a href="#pricing" className="hover:text-foreground">Priser</a>
            <a href="#companies" className="hover:text-foreground">Företag</a>
            <a href="#recruiters" className="hover:text-foreground">Rekryterare</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Logga in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Kom igång</Button>
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
                Rekrytering utan onödigt mellanled
              </span>

              <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-bold text-brand-900 leading-tight">
                För företag och rekryterare
                <br />
                <span className="text-brand-600">närmare varandra.</span>
              </h1>

              <p className="mt-5 text-lg text-muted-foreground max-w-xl">
                Recruito kopplar ihop rätt bolag med godkända frilansrekryterare i ett gemensamt flöde. Snabbare tillsättning, tydligare process och bättre kvalitet i varje anställning.
              </p>

              <div className="mt-6 grid sm:grid-cols-2 gap-3 max-w-2xl">
                <div className="rounded-xl border border-border bg-white/80 p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">För företag</p>
                  <p className="mt-1 text-sm font-medium text-foreground">Publicera en roll och få kandidater från flera rekryterare samtidigt.</p>
                </div>
                <div className="rounded-xl border border-border bg-white/80 p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">För rekryterare</p>
                  <p className="mt-1 text-sm font-medium text-foreground">Ta relevanta mandat och tjäna på kvalitet, inte volym.</p>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link href="/register/company">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
                    <Building2 className="h-5 w-5" /> Företag - Publicera jobb
                  </Button>
                </Link>
                <Link href="/register/recruiter">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 border-success-500 text-success-700 hover:bg-success-50">
                    <UserCircle className="h-5 w-5" /> Rekryterare - Börja tjäna
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-8 -right-8 h-44 w-44 rounded-full bg-brand-200/30 blur-3xl" />
              <div className="relative aspect-[3/2] overflow-hidden rounded-3xl border border-brand-100 shadow-[0_22px_50px_-22px_rgba(30,58,138,0.55)]">
                <Image
                  src="/images/recruito-hero-team.png"
                  alt="Team som samarbetar i Recruito"
                  width={1536}
                  height={1024}
                  priority
                  className="h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-900/30 via-transparent to-white/35" />
                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/90 backdrop-blur px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Matchning</p>
                    <p className="text-xs font-semibold text-foreground">Upp till 5 rekryterare per uppdrag</p>
                  </div>
                  <div className="rounded-lg bg-white/90 backdrop-blur px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Trygghet</p>
                    <p className="text-xs font-semibold text-foreground">Upp till 60 dagars garanti vid anställning</p>
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
          <h2 className="text-3xl font-bold text-center mb-12">Så fungerar det</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Briefcase, title: "1. Publicera jobb", desc: "Företaget publicerar en jobbannons med krav och budget. Upp till 5 rekryterare kan ta uppdraget." },
              { icon: Users, title: "2. Rekryterare söker", desc: "Godkända rekryterare presenterar sina bästa kandidater från sina nätverk. Du väljer de bästa." },
              { icon: CheckCircle, title: "3. Betala vid framgång", desc: "Betala från 12% av årslönen vid lyckad anställning. Lägre arvode vid fler placeringar." },
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
          <h2 className="text-3xl font-bold text-center mb-4">Fördelar för företag</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Spara pengar och hitta bättre kandidater snabbare.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: TrendingDown, title: "60% billigare", desc: "Jämfört med traditionella rekryteringsbyråer" },
              { icon: Users, title: "Flera jobbar parallellt", desc: "Upp till 5 rekryterare på varje uppdrag" },
              { icon: CheckCircle, title: "Betala vid framgång", desc: "Ingen kostnad om kandidaten inte anställs" },
              { icon: Shield, title: "Upp till 60 dagars garanti", desc: "Full återbetalning om kandidaten slutar" },
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
          <h2 className="text-3xl font-bold text-center mb-4">Fördelar för rekryterare</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Tjäna mer och jobba friare som frilansande rekryterare.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Zap, title: "Fler uppdrag", desc: "Tillgång till hundratals jobb i Skandinavien" },
              { icon: Star, title: "75% av avgiften", desc: "Mer än vad traditionella byråer betalar" },
              { icon: Clock, title: "Jobba fritt", desc: "Välj uppdrag, tid och plats själv" },
              { icon: TrendingDown, title: "Bygg ditt rykte", desc: "Betyg och recensioner som stärker din profil" },
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
          <h2 className="text-3xl font-bold text-center mb-4">Räkna på din besparing</h2>
          <p className="text-center text-muted-foreground mb-10">
            Se hur mycket du sparar jämfört med en traditionell rekryteringsbyrå.
          </p>
          <Card className="p-8">
            <label className="block text-sm font-medium mb-2">Kandidatens årslön (SEK)</label>
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
                <p className="text-sm text-muted-foreground">Traditionell byrå (25%)</p>
                <p className="text-2xl font-bold text-danger-700 mt-1">{formatCurrency(traditionalFee)}</p>
              </div>
              <div className="p-4 bg-success-50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Recruito (från 12%)</p>
                <p className="text-2xl font-bold text-success-700 mt-1">{formatCurrency(salary * 0.12)} – {formatCurrency(fees.totalFee)}</p>
                <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                  <p>0–2 placeringar: 15%</p>
                  <p>3+ placeringar: 13%</p>
                  <p>5+ placeringar: 12%</p>
                </div>
              </div>
            </div>

            <div className="text-center mt-6 p-4 bg-brand-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Företaget sparar</p>
              <p className="text-3xl font-bold text-brand-600">
                {formatCurrency(traditionalFee - fees.totalFee)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Rekryteraren tjänar {formatCurrency(fees.recruiterFee)}
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-brand-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Redo att börja?</h2>
          <p className="text-brand-200 mb-8 text-lg">
            Anslut dig till Skandinaviens snabbast växande rekryteringsmarknadsplats.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register/company">
              <Button size="lg" className="w-full sm:w-auto bg-white text-brand-600 hover:bg-brand-50 gap-2">
                Registrera företag <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register/recruiter">
              <Button size="lg" className="w-full sm:w-auto bg-success-500 text-white hover:bg-success-700 gap-2">
                Bli rekryterare <ArrowRight className="h-4 w-4" />
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
                Skandinaviens rekryteringsmarknadsplats.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Plattform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/#how-it-works" className="hover:text-foreground">Så fungerar det</a></li>
                <li><a href="/#pricing" className="hover:text-foreground">Priser</a></li>
                <li><a href="mailto:hello@recruito.se" className="hover:text-foreground">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Företag</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/#companies" className="hover:text-foreground">Om oss</a></li>
                <li><a href="mailto:hello@recruito.se" className="hover:text-foreground">Kontakt</a></li>
                <li><a href="mailto:hello@recruito.se" className="hover:text-foreground">Blogg</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Juridik</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/anvandarvillkor" className="hover:text-foreground">Användarvillkor</Link></li>
                <li><Link href="/integritetspolicy" className="hover:text-foreground">Integritetspolicy</Link></li>
                <li><Link href="/gdpr" className="hover:text-foreground">GDPR</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            &copy; 2025 Recruito. Alla rättigheter förbehållna.
          </div>
        </div>
      </footer>
    </div>
  );
}
