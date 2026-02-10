import Link from "next/link";
import {
  Briefcase,
  Search,
  CheckCircle,
  TrendingDown,
  Users,
  CreditCard,
  Shield,
  Star,
  Zap,
  Clock,
  ArrowRight,
  Linkedin,
  Twitter,
  Mail,
} from "lucide-react";
import { FeeCalculatorSection } from "@/components/landing/fee-calculator-section";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ───── Header / Navbar ───── */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#1B4F72]">Rekryto</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#hur-det-fungerar"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sa fungerar det
            </a>
            <a
              href="#foretag"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              For foretag
            </a>
            <a
              href="#rekryterare"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              For rekryterare
            </a>
            <a
              href="#kalkylator"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Priser
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Logga in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center justify-center rounded-md bg-[#27AE60] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#219a52]"
            >
              Kom igang
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ───── Hero Section ───── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-50/50 px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          {/* Decorative background elements */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-40 -top-40 size-96 rounded-full bg-brand-100/40 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-success-50/60 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-[#1B4F72] sm:text-5xl lg:text-6xl">
              Rekrytera snabbare.
              <br />
              Billigare. Battre.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Skandinaviens marknadsplats som kopplar samman foretag med
              frilansande rekryterare. Publicera jobb, fa kandidater
              presenterade och betala bara vid lyckad anstallning.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register/company"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#27AE60] px-8 text-base font-semibold text-white shadow-md transition-all hover:bg-[#219a52] hover:shadow-lg"
              >
                <Briefcase className="size-5" />
                Foretag — Publicera jobb
              </Link>
              <Link
                href="/register/recruiter"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-[#1B4F72] bg-white px-8 text-base font-semibold text-[#1B4F72] shadow-sm transition-all hover:bg-brand-50 hover:shadow-md"
              >
                <Search className="size-5" />
                Rekryterare — Borja tjana
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="size-4 text-success-500" />
                Ingen startavgift
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="size-4 text-success-500" />
                Betala vid anstallning
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="size-4 text-success-500" />
                90 dagars garanti
              </span>
            </div>
          </div>
        </section>

        {/* ───── Så fungerar det ───── */}
        <section
          id="hur-det-fungerar"
          className="bg-white px-4 py-24 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#1B4F72] sm:text-4xl">
                Sa fungerar det
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Tre enkla steg till din nasta lyckade rekrytering
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Step 1 */}
              <div className="group relative rounded-2xl border bg-white p-8 shadow-sm transition-all hover:shadow-md">
                <div className="absolute -top-4 left-8 flex size-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  1
                </div>
                <div className="mb-5 flex size-14 items-center justify-center rounded-xl bg-brand-50 transition-colors group-hover:bg-brand-100">
                  <Briefcase className="size-7 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Foretag publicerar
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Skapa en jobbannons med kravprofil, lonespann och
                  rekryteringsavgift. Upp till 5 rekryterare kan ta uppdraget.
                </p>
              </div>

              {/* Step 2 */}
              <div className="group relative rounded-2xl border bg-white p-8 shadow-sm transition-all hover:shadow-md">
                <div className="absolute -top-4 left-8 flex size-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  2
                </div>
                <div className="mb-5 flex size-14 items-center justify-center rounded-xl bg-success-50 transition-colors group-hover:bg-success-50/80">
                  <Search className="size-7 text-success-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Rekryterare hittar kandidater
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Rekryterare i nätverket hittar kandidater och presenterar dem
                  direkt till foretaget via plattformen.
                </p>
              </div>

              {/* Step 3 */}
              <div className="group relative rounded-2xl border bg-white p-8 shadow-sm transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
                <div className="absolute -top-4 left-8 flex size-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  3
                </div>
                <div className="mb-5 flex size-14 items-center justify-center rounded-xl bg-warning-50 transition-colors group-hover:bg-warning-50/80">
                  <CheckCircle className="size-7 text-warning-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Betala vid framgang
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Ingen kostnad forran en kandidat anstalls. 15% av arslonen som
                  avgift, med 90 dagars garanti vid uppsagning.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ───── Fördelar för företag ───── */}
        <section
          id="foretag"
          className="bg-gradient-to-b from-brand-50/30 to-white px-4 py-24 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#1B4F72] sm:text-4xl">
                Fordelar for foretag
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Spara tid och pengar med en smartare rekryteringsmodell
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Benefit 1 */}
              <div className="rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand-50">
                  <TrendingDown className="size-6 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Upp till 60% billigare
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Varfor betala 20-30% nar du kan fa samma resultat till 15% av
                  arslonen?
                </p>
              </div>

              {/* Benefit 2 */}
              <div className="rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-success-50">
                  <Users className="size-6 text-success-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Flera rekryterare parallellt
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Upp till 5 rekryterare soker kandidater at dig samtidigt. Bredare
                  natverk, snabbare resultat.
                </p>
              </div>

              {/* Benefit 3 */}
              <div className="rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-warning-50">
                  <CreditCard className="size-6 text-warning-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Betala bara vid lyckad anstallning
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Ingen risk. Inga forskottsavgifter. Du betalar forst nar ratt
                  kandidat ar pa plats.
                </p>
              </div>

              {/* Benefit 4 */}
              <div className="rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand-50">
                  <Shield className="size-6 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  90 dagars garanti
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Om kandidaten slutar inom 90 dagar aterbetalar vi avgiften.
                  Trygg rekrytering.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ───── Fördelar för rekryterare ───── */}
        <section
          id="rekryterare"
          className="bg-white px-4 py-24 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#1B4F72] sm:text-4xl">
                Fordelar for rekryterare
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Bygg din karriar som frilansande rekryterare
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Benefit 1 */}
              <div className="rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-success-50">
                  <Zap className="size-6 text-success-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Fler uppdrag
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Fa tillgang till en strom av rekryteringsuppdrag fran foretag
                  over hela Skandinavien.
                </p>
              </div>

              {/* Benefit 2 */}
              <div className="rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand-50">
                  <CreditCard className="size-6 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  75% av avgiften
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Du behar 75% av rekryteringsavgiften. Vi tar bara 25% for
                  plattformen.
                </p>
              </div>

              {/* Benefit 3 */}
              <div className="rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-warning-50">
                  <Clock className="size-6 text-warning-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Jobba flexibelt
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Valj dina egna uppdrag, jobba nar och var du vill. Full frihet
                  som frilansare.
                </p>
              </div>

              {/* Benefit 4 */}
              <div className="rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-success-50">
                  <Star className="size-6 text-success-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Bygg ditt rykte
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Samla omdomen och betyg fran foretag. Hogre betyg ger fler
                  uppdrag och battre villkor.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ───── Calculator Section ───── */}
        <div id="kalkylator">
          <FeeCalculatorSection />
        </div>

        {/* ───── Social Proof / Kommande ───── */}
        <section className="bg-white px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-warning-50 px-4 py-1.5 text-sm font-medium text-warning-700">
                Kommande
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-[#1B4F72] sm:text-4xl">
                Ga med fran borjan
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Vi bygger framtidens rekryteringsplattform for Skandinavien.
                Registrera dig idag och bli en av de forsta anvandarna.
              </p>

              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                <div className="rounded-2xl border bg-brand-50/50 p-6">
                  <p className="text-3xl font-bold text-brand-600">500+</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Foretag i ko
                  </p>
                </div>
                <div className="rounded-2xl border bg-success-50/50 p-6">
                  <p className="text-3xl font-bold text-success-500">200+</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Rekryterare registrerade
                  </p>
                </div>
                <div className="rounded-2xl border bg-warning-50/50 p-6">
                  <p className="text-3xl font-bold text-warning-500">3</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Lander — SE, NO, DK
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── CTA Section ───── */}
        <section className="bg-gradient-to-br from-[#1B4F72] to-brand-800 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Redo att borja?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-200">
              Ga med i Rekryto idag och upplev en smartare, billigare och
              snabbare rekrytering.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register/company"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#27AE60] px-8 text-base font-semibold text-white shadow-md transition-all hover:bg-[#219a52] hover:shadow-lg"
              >
                <Briefcase className="size-5" />
                Foretag — Publicera jobb
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/register/recruiter"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-white/30 bg-white/10 px-8 text-base font-semibold text-white shadow-sm backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-md"
              >
                <Search className="size-5" />
                Rekryterare — Borja tjana
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ───── Footer ───── */}
      <footer className="border-t bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <span className="text-xl font-bold text-[#1B4F72]">Rekryto</span>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Skandinaviens marknadsplats for rekrytering. Vi kopplar samman
                foretag med topprekryterare.
              </p>
              <div className="mt-4 flex gap-3">
                <a
                  href="#"
                  className="flex size-9 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="size-4" />
                </a>
                <a
                  href="#"
                  className="flex size-9 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Twitter"
                >
                  <Twitter className="size-4" />
                </a>
                <a
                  href="#"
                  className="flex size-9 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="E-post"
                >
                  <Mail className="size-4" />
                </a>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Plattformen
              </h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <a
                    href="#hur-det-fungerar"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Sa fungerar det
                  </a>
                </li>
                <li>
                  <a
                    href="#foretag"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    For foretag
                  </a>
                </li>
                <li>
                  <a
                    href="#rekryterare"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    For rekryterare
                  </a>
                </li>
                <li>
                  <a
                    href="#kalkylator"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Priser
                  </a>
                </li>
              </ul>
            </div>

            {/* Om oss */}
            <div>
              <h4 className="text-sm font-semibold text-foreground">Om oss</h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Om Rekryto
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Kontakt
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Blogg
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Karriar
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Juridiskt
              </h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Villkor
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Integritetspolicy
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    GDPR
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Cookies
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 border-t pt-8">
            <p className="text-center text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Rekryto AB. Alla rattigheter
              forbehallna. Organisationsnummer: 559XXX-XXXX
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
