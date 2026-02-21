import Link from "next/link";
import { getTranslations } from "@/i18n/server";

export default async function GdprPage() {
  const t = await getTranslations("legal");

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{t.gdprTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.lastUpdated}</p>
      </header>

      <section className="space-y-3 text-sm leading-6">
        <p>{t.gdprIntro}</p>
        <p>{t.gdprSecurityMeasures}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t.registerExtractTitle}</h2>
        <p className="text-sm leading-6">{t.registerExtractText}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t.supervisoryAuthorityTitle}</h2>
        <p className="text-sm leading-6">{t.supervisoryAuthorityText}</p>
      </section>

      <footer className="pt-4 border-t border-border text-sm">
        <Link href="/integritetspolicy" className="text-brand-600 hover:underline">{t.toPrivacyPolicy}</Link>
      </footer>
    </main>
  );
}
