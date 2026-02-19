"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-xl font-bold text-brand-600">Recruito</span>
          </div>
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
      <section className="py-20 md:py-32">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-brand-800 leading-tight">
            Rekrytera snabbare.
            <br />
            <span className="text-brand-600">Billigare. Bättre.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Den skandinaviska marknadsplatsen som kopplar samman företag med de bästa frilansande rekryterarna.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register/company">
              <Button size="lg" className="w-full sm:w-auto gap-2">
                <Building2 className="h-5 w-5" /> Företag — Publicera jobb
              </Button>
            </Link>
            <Link href="/register/recruiter">
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 border-success-500 text-success-700 hover:bg-success-50">
                <UserCircle className="h-5 w-5" /> Rekryterare — Börja tjäna
              </Button>
            </Link>
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
              { icon: CheckCircle, title: "3. Betala vid framgång", desc: "Betala bara 15% av årslönen vid lyckad anställning. 90 dagars garanti ingår." },
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
              { icon: Shield, title: "90 dagars garanti", desc: "Full återbetalning om kandidaten slutar" },
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
                <p className="text-sm text-muted-foreground">Recruito (15%)</p>
                <p className="text-2xl font-bold text-success-700 mt-1">{formatCurrency(fees.totalFee)}</p>
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
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">R</span>
                </div>
                <span className="text-xl font-bold text-brand-600">Recruito</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Skandinaviens rekryteringsmarknadsplats.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Plattform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Så fungerar det</a></li>
                <li><a href="#" className="hover:text-foreground">Priser</a></li>
                <li><a href="#" className="hover:text-foreground">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Företag</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Om oss</a></li>
                <li><a href="#" className="hover:text-foreground">Kontakt</a></li>
                <li><a href="#" className="hover:text-foreground">Blogg</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Juridik</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Användarvillkor</a></li>
                <li><a href="#" className="hover:text-foreground">Integritetspolicy</a></li>
                <li><a href="#" className="hover:text-foreground">GDPR</a></li>
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
