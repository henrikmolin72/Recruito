import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Integritetspolicy</h1>
        <p className="text-sm text-muted-foreground">Senast uppdaterad: 19 februari 2026</p>
      </header>

      <section className="space-y-3 text-sm leading-6">
        <p>
          Recruito behandlar personuppgifter för att leverera rekryteringstjänsten till företag, rekryterare och kandidater.
          Vi följer Dataskyddsförordningen (GDPR) och tillämplig svensk lagstiftning.
        </p>
        <p>
          Personuppgifter som kan behandlas inkluderar kontaktuppgifter, CV-information, kommunikation i plattformen,
          samt historik kopplad till rekryteringsprocesser.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Ändamål och rättslig grund</h2>
        <ul className="list-disc pl-6 text-sm leading-6 space-y-1">
          <li>Leverans av tjänsten och avtalad funktionalitet.</li>
          <li>Kommunikation mellan parter i rekryteringsprocessen.</li>
          <li>Rättsliga förpliktelser, bokföring och säkerhetsarbete.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Lagringstid</h2>
        <p className="text-sm leading-6">
          Vi sparar personuppgifter endast så länge de behövs för ändamålet eller enligt lagkrav. Kandidatdata kan anonymiseras
          eller raderas när rekryteringsprocessen är avslutad och rättsliga krav är uppfyllda.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Dina rättigheter</h2>
        <p className="text-sm leading-6">
          Du har rätt till tillgång, rättelse, radering, begränsning, dataportabilitet och att invända mot viss behandling.
          För frågor eller begäran, kontakta oss via <a className="text-brand-600 underline" href="mailto:privacy@recruito.se">privacy@recruito.se</a>.
        </p>
      </section>

      <footer className="pt-4 border-t border-border text-sm">
        <Link href="/gdpr" className="text-brand-600 hover:underline">Läs mer om GDPR</Link>
      </footer>
    </main>
  );
}
