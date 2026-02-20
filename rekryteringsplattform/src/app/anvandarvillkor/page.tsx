export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Användarvillkor</h1>
        <p className="text-sm text-muted-foreground">Senast uppdaterad: 19 februari 2026</p>
      </header>

      <section className="space-y-2 text-sm leading-6">
        <p>
          Genom att använda Recruito accepterar du dessa villkor. Tjänsten får endast användas för lagliga rekryteringsändamål.
        </p>
        <p>
          Konton får inte delas med obehöriga. Användaren ansvarar för att information som publiceras i plattformen är korrekt och
          förenlig med gällande lag.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Ansvar och begränsningar</h2>
        <p className="text-sm leading-6">
          Recruito tillhandahåller en plattform för matchning mellan företag och rekryterare. Parterna ansvarar själva för avtal,
          urvalsbeslut och arbetsrättsliga skyldigheter.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Kontakt</h2>
        <p className="text-sm leading-6">Frågor om villkor skickas till legal@recruito.se.</p>
      </section>
    </main>
  );
}
