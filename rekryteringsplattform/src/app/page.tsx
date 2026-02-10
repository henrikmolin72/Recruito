import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-brand-600">Rekryto</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Logga in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white shadow-xs hover:bg-brand-700"
            >
              Kom igång
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Hitta rätt talang genom{" "}
              <span className="text-brand-600">Sveriges bästa rekryterare</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Rekryto kopplar samman företag med frilansande rekryterare och
              headhunters i Skandinavien. Publicera jobb, få kandidater
              presenterade, och betala bara vid lyckad anställning.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register/company"
                className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-8 text-sm font-medium text-white shadow-xs hover:bg-brand-700"
              >
                Jag vill rekrytera
              </Link>
              <Link
                href="/register/recruiter"
                className="inline-flex h-11 items-center justify-center rounded-md border border-brand-600 bg-white px-8 text-sm font-medium text-brand-600 shadow-xs hover:bg-brand-50"
              >
                Jag är rekryterare
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
              Så fungerar det
            </h2>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                  <span className="text-xl font-bold">1</span>
                </div>
                <h3 className="text-lg font-semibold">Publicera jobb</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Företag skapar en jobbannons med kravprofil, lön och avgift.
                  Upp till 5 rekryterare kan ta uppdraget.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-success-50 text-success-500">
                  <span className="text-xl font-bold">2</span>
                </div>
                <h3 className="text-lg font-semibold">Presentera kandidater</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Rekryterare hittar kandidater från sina nätverk och
                  presenterar dem direkt till företaget via plattformen.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-warning-50 text-warning-500">
                  <span className="text-xl font-bold">3</span>
                </div>
                <h3 className="text-lg font-semibold">Betala vid anställning</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ingen kostnad förrän en kandidat anställs. 15% av årslönen
                  som avgift, med 90 dagars garanti.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Rekryto. Alla rättigheter
          förbehållna.
        </div>
      </footer>
    </div>
  );
}
