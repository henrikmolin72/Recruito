import { getTranslations } from "@/i18n/server";

export default async function TermsPage() {
  const t = await getTranslations("legal");

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{t.termsTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.lastUpdated}</p>
      </header>

      <section className="space-y-2 text-sm leading-6">
        <p>{t.termsIntro}</p>
        <p>{t.termsAccountSharing}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t.responsibilityTitle}</h2>
        <p className="text-sm leading-6">{t.responsibilityText}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t.contactTitle}</h2>
        <p className="text-sm leading-6">{t.contactText}</p>
      </section>
    </main>
  );
}
