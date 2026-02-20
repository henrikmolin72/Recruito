import Link from "next/link";

export default function GdprPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">GDPR-information</h1>
        <p className="text-sm text-muted-foreground">Senast uppdaterad: 19 februari 2026</p>
      </header>

      <section className="space-y-3 text-sm leading-6">
        <p>
          Recruito agerar normalt som personuppgiftsansvarig för kontodata och som personuppgiftsbiträde i delar av rekryteringsflödet,
          beroende på vilken tjänst som används och vilken part som bestämmer ändamålet.
        </p>
        <p>
          Vi tillämpar tekniska och organisatoriska säkerhetsåtgärder, inklusive åtkomstkontroll, loggning och principen om
          minsta möjliga behörighet.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Begäran om registerutdrag</h2>
        <p className="text-sm leading-6">
          Kontakta oss via <a className="text-brand-600 underline" href="mailto:privacy@recruito.se">privacy@recruito.se</a> om du vill begära registerutdrag
          eller utöva andra rättigheter enligt GDPR.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Tillsynsmyndighet</h2>
        <p className="text-sm leading-6">
          Du har rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY) om du anser att vår behandling strider mot GDPR.
        </p>
      </section>

      <footer className="pt-4 border-t border-border text-sm">
        <Link href="/integritetspolicy" className="text-brand-600 hover:underline">Till integritetspolicyn</Link>
      </footer>
    </main>
  );
}
