export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-brand-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-2xl font-bold text-brand-600">Rekryto</div>
          <nav className="flex items-center gap-6">
            <a
              href="#how-it-works"
              className="text-sm text-muted hover:text-brand-600"
            >
              Hur det fungerar
            </a>
            <a
              href="#for-companies"
              className="text-sm text-muted hover:text-brand-600"
            >
              For foretag
            </a>
            <a
              href="#for-recruiters"
              className="text-sm text-muted hover:text-brand-600"
            >
              For rekryterare
            </a>
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Logga in
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold leading-tight tracking-tight text-brand-800">
          Hitta ratt kandidat.
          <br />
          <span className="text-brand-500">Snabbare.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          Rekryto kopplar samman foretag med Skandinaviens basta frilansande
          rekryterare. Publicera ett jobb, lat rekryterare tavla om att hitta
          kandidater, och betala bara vid lyckad anstallning.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <button className="rounded-lg bg-brand-600 px-6 py-3 text-base font-medium text-white hover:bg-brand-700">
            Registrera foretag
          </button>
          <button className="rounded-lg border border-brand-200 px-6 py-3 text-base font-medium text-brand-600 hover:bg-brand-50">
            Bli rekryterare
          </button>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-brand-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-brand-800">
            Hur det fungerar
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-xl font-bold text-brand-600">
                1
              </div>
              <h3 className="mt-4 text-lg font-semibold text-brand-800">
                Publicera ett jobb
              </h3>
              <p className="mt-2 text-muted">
                Beskriv rollen, krav och lonintervall. Upp till 5 rekryterare kan
                ta sig an uppdraget.
              </p>
            </div>
            <div className="rounded-xl bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-xl font-bold text-brand-600">
                2
              </div>
              <h3 className="mt-4 text-lg font-semibold text-brand-800">
                Rekryterare presenterar kandidater
              </h3>
              <p className="mt-2 text-muted">
                Godkanda rekryterare soker i sina natverk och presenterar
                kvalificerade kandidater direkt i plattformen.
              </p>
            </div>
            <div className="rounded-xl bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-xl font-bold text-brand-600">
                3
              </div>
              <h3 className="mt-4 text-lg font-semibold text-brand-800">
                Betala vid lyckad anstallning
              </h3>
              <p className="mt-2 text-muted">
                15% av arslonen vid lyckad placering. 90 dagars garantiperiod
                ingar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20">
        <div className="mx-auto grid max-w-4xl gap-8 px-6 text-center md:grid-cols-3">
          <div>
            <div className="text-4xl font-bold text-brand-600">15%</div>
            <div className="mt-2 text-muted">Avgift vid lyckad placering</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-brand-600">90</div>
            <div className="mt-2 text-muted">Dagars garantiperiod</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-brand-600">5</div>
            <div className="mt-2 text-muted">Max rekryterare per jobb</div>
          </div>
        </div>
      </section>

      {/* CTA sections */}
      <section className="bg-brand-50 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2">
          <div id="for-companies" className="rounded-xl bg-white p-10 shadow-sm">
            <h3 className="text-2xl font-bold text-brand-800">For foretag</h3>
            <ul className="mt-6 space-y-3 text-muted">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-success">&#10003;</span>
                Publicera jobb gratis
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-success">&#10003;</span>
                Betala bara vid lyckad anstallning
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-success">&#10003;</span>
                Granska kandidater i realtid
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-success">&#10003;</span>
                90 dagars garantiperiod
              </li>
            </ul>
            <button className="mt-8 rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700">
              Kom igang
            </button>
          </div>
          <div id="for-recruiters" className="rounded-xl bg-white p-10 shadow-sm">
            <h3 className="text-2xl font-bold text-brand-800">
              For rekryterare
            </h3>
            <ul className="mt-6 space-y-3 text-muted">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-success">&#10003;</span>
                Tillgang till kvalificerade uppdrag
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-success">&#10003;</span>
                75% av rekryteringsavgiften
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-success">&#10003;</span>
                Arbeta nar och var du vill
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-success">&#10003;</span>
                Automatisk utbetalning via Stripe
              </li>
            </ul>
            <button className="mt-8 rounded-lg border border-brand-200 px-6 py-3 text-sm font-medium text-brand-600 hover:bg-brand-50">
              Ansok som rekryterare
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-100 py-10">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted">
          &copy; 2026 Rekryto. Rekryteringsmarknadsplats for Skandinavien.
        </div>
      </footer>
    </div>
  );
}
