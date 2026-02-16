"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  UserSearch,
  CheckCircle,
  Shield,
  Users,
  Zap,
  Calculator,
  ArrowRight,
} from "lucide-react";
import { formatCurrency, calculateFee } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <HeroSection />
      <HowItWorks />
      <CompanyBenefits />
      <RecruiterBenefits />
      <SalaryCalculator />
      <CTASection />
      <Footer />
    </div>
  );
}

function NavBar() {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-2xl font-bold text-brand-600">
          Rekryto
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Logga in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
          >
            Kom igång
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-brand-50 to-white py-20 lg:py-32">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-brand-800 lg:text-6xl">
          Rekrytera snabbare.{" "}
          <span className="text-brand-600">Billigare.</span>{" "}
          <span className="text-success-500">Bättre.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground lg:text-xl">
          Den skandinaviska marknadsplatsen som kopplar samman företag med de
          bästa frilansande rekryterarna. Betala bara vid lyckad anställning.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/register/company"
            className="inline-flex h-12 items-center gap-2 rounded-md bg-brand-600 px-8 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Building2 className="h-4 w-4" />
            Företag — Publicera jobb
          </Link>
          <Link
            href="/register/recruiter"
            className="inline-flex h-12 items-center gap-2 rounded-md bg-success-500 px-8 text-sm font-medium text-white hover:bg-success-700"
          >
            <UserSearch className="h-4 w-4" />
            Rekryterare — Börja tjäna
          </Link>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Building2,
      title: "1. Företag publicerar",
      description:
        "Beskriv rollen du söker, sätt lön och avgift. Upp till 5 rekryterare kan ta uppdraget.",
    },
    {
      icon: UserSearch,
      title: "2. Rekryterare hittar",
      description:
        "Kvalificerade rekryterare presenterar kandidater från sina nätverk direkt till dig.",
    },
    {
      icon: CheckCircle,
      title: "3. Betala vid framgång",
      description:
        "Betala bara när du hittat rätt person. 90 dagars garanti ingår alltid.",
    },
  ];

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-12 text-center text-3xl font-bold text-brand-800">
          Så fungerar det
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
                <step.icon className="h-8 w-8 text-brand-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompanyBenefits() {
  const benefits = [
    {
      icon: Zap,
      title: "Upp till 60% billigare",
      description: "Jämfört med traditionella rekryteringsbyråer.",
    },
    {
      icon: Users,
      title: "Flera rekryterare parallellt",
      description: "Upp till 5 rekryterare jobbar samtidigt med ditt uppdrag.",
    },
    {
      icon: CheckCircle,
      title: "Betala bara vid framgång",
      description: "Ingen kostnad förrän du hittat rätt kandidat.",
    },
    {
      icon: Shield,
      title: "90 dagars garanti",
      description: "Pengarna tillbaka om kandidaten slutar inom 90 dagar.",
    },
  ];

  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-4 text-center text-3xl font-bold text-brand-800">
          Fördelar för företag
        </h2>
        <p className="mb-12 text-center text-muted-foreground">
          Enklare, billigare och tryggare rekrytering.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-lg border bg-card p-6">
              <b.icon className="mb-3 h-8 w-8 text-brand-500" />
              <h3 className="mb-1 font-semibold">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RecruiterBenefits() {
  const benefits = [
    {
      icon: Zap,
      title: "Fler uppdrag",
      description: "Tillgång till ett brett flöde av rekryteringsuppdrag.",
    },
    {
      icon: Calculator,
      title: "75% av avgiften",
      description: "Mer i fickan än traditionella byråer betalar.",
    },
    {
      icon: Users,
      title: "Arbeta flexibelt",
      description: "Jobba när och var du vill, med ditt eget nätverk.",
    },
    {
      icon: Shield,
      title: "Bygg ditt rykte",
      description: "Samla betyg och recensioner för fler uppdrag.",
    },
  ];

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-4 text-center text-3xl font-bold text-brand-800">
          Fördelar för rekryterare
        </h2>
        <p className="mb-12 text-center text-muted-foreground">
          Tjäna mer, arbeta smartare.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-lg border bg-card p-6">
              <b.icon className="mb-3 h-8 w-8 text-success-500" />
              <h3 className="mb-1 font-semibold">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SalaryCalculator() {
  const [salary, setSalary] = useState(600000);
  const fee = calculateFee(salary);

  return (
    <section className="bg-brand-600 py-20 text-white">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <Calculator className="mx-auto mb-4 h-10 w-10 text-brand-200" />
        <h2 className="mb-2 text-3xl font-bold">Beräkna din kostnad</h2>
        <p className="mb-8 text-brand-200">
          Se vad det kostar att rekrytera via Rekryto jämfört med en traditionell
          byrå.
        </p>

        <div className="mb-8">
          <label className="mb-2 block text-sm font-medium text-brand-200">
            Kandidatens årslön (SEK)
          </label>
          <input
            type="range"
            min={300000}
            max={1500000}
            step={50000}
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value))}
            className="w-full accent-white"
          />
          <p className="mt-2 text-2xl font-bold">{formatCurrency(salary)}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white/10 p-4">
            <p className="text-sm text-brand-200">Rekryto-avgift (15%)</p>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(fee.totalFee)}
            </p>
          </div>
          <div className="rounded-lg bg-white/10 p-4">
            <p className="text-sm text-brand-200">Traditionell byrå (~25%)</p>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(salary * 0.25)}
            </p>
          </div>
          <div className="rounded-lg bg-success-500/20 p-4">
            <p className="text-sm text-green-200">Du sparar</p>
            <p className="mt-1 text-2xl font-bold text-green-300">
              {formatCurrency(salary * 0.25 - fee.totalFee)}
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm text-brand-200">
          Rekryteraren tjänar {formatCurrency(fee.recruiterFee)} per lyckad
          placering
        </p>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 className="mb-4 text-3xl font-bold text-brand-800">
          Redo att komma igång?
        </h2>
        <p className="mb-8 text-muted-foreground">
          Registrera dig idag och börja rekrytera smartare.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/register/company"
            className="inline-flex h-12 items-center gap-2 rounded-md bg-brand-600 px-8 text-sm font-medium text-white hover:bg-brand-700"
          >
            Registrera som företag
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/register/recruiter"
            className="inline-flex h-12 items-center gap-2 rounded-md border-2 border-success-500 px-8 text-sm font-medium text-success-500 hover:bg-success-50"
          >
            Registrera som rekryterare
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-gray-50 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="text-xl font-bold text-brand-600">Rekryto</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Rekryteringsmarknadsplatsen för Skandinavien.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Plattform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/register/company" className="hover:text-foreground">För företag</Link></li>
              <li><Link href="/register/recruiter" className="hover:text-foreground">För rekryterare</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Information</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><span className="hover:text-foreground">Om oss</span></li>
              <li><span className="hover:text-foreground">Kontakt</span></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Juridik</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><span className="hover:text-foreground">Villkor</span></li>
              <li><span className="hover:text-foreground">Integritetspolicy</span></li>
              <li><span className="hover:text-foreground">GDPR</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Rekryto. Alla rättigheter
          förbehållna.
        </div>
      </div>
    </footer>
  );
}
