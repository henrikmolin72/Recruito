import Link from "next/link";
import { getTranslations } from "@/i18n/server";

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("legal");

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{t.privacyTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.lastUpdated}</p>
      </header>

      <section className="space-y-3 text-sm leading-6">
        <p>{t.privacyIntro}</p>
        <p>{t.privacyDataTypes}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t.purposeAndLegalBasisTitle}</h2>
        <ul className="list-disc pl-6 text-sm leading-6 space-y-1">
          <li>{t.purposeServiceDelivery}</li>
          <li>{t.purposeCommunication}</li>
          <li>{t.purposeLegalObligations}</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t.storageTitle}</h2>
        <p className="text-sm leading-6">{t.storageText}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t.yourRightsTitle}</h2>
        <p className="text-sm leading-6">
          {t.yourRightsText}
        </p>
      </section>

      <footer className="pt-4 border-t border-border text-sm">
        <Link href="/gdpr" className="text-brand-600 hover:underline">{t.readMoreGdpr}</Link>
      </footer>
    </main>
  );
}
