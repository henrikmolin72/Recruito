import Link from "next/link";
import { getLocale } from "@/i18n/server";

// Privacy Policy. Long-form legal text lives in the component rather than in
// i18n dictionaries — structured prose with lists/headings is unmanageable as
// JSON strings. Swedish is canonical (pilot audience); English is a full
// translation. NO/DA fall back to Swedish text with a header note that native
// translation is pending — accuracy beats half-translated legalese.

const LAST_UPDATED = "2026-05-14";
const CONTACT_EMAIL = "privacy@recruito.eu";
const SUPPORT_EMAIL = "hello@recruito.eu";

function DraftBanner({ locale }: { locale: string }) {
    const text = locale === "en"
        ? "Version 1 — under external legal review. This document is binding from publication; updates will be communicated by email to registered users."
        : "Version 1 — under extern juridisk granskning. Dokumentet gäller från publicering. Uppdateringar meddelas via e-post till registrerade användare.";
    return (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {text}
        </div>
    );
}

function SwedishPolicy() {
    return (
        <>
            <p>
                Recruito AB ("Recruito", "vi") respekterar din integritet och behandlar
                personuppgifter i enlighet med EU:s dataskyddsförordning (GDPR) och svensk
                lag. Den här policyn beskriver vilka uppgifter vi samlar in, varför, hur
                länge vi sparar dem, och vilka rättigheter du har.
            </p>

            <h2 className="mt-8 text-xl font-semibold">1. Personuppgiftsansvarig</h2>
            <p>
                Recruito AB, org.nr [organisationsnummer], är personuppgiftsansvarig för
                behandlingen av personuppgifter som beskrivs nedan. Företagskunder som
                använder plattformen för att rekrytera är själva personuppgiftsansvariga
                för kandidatdata de behandlar i sina pipelines — Recruito är då
                personuppgiftsbiträde åt dem och behandlingen regleras separat av ett
                biträdesavtal (DPA).
            </p>
            <p>Kontakt: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>

            <h2 className="mt-8 text-xl font-semibold">2. Vilka uppgifter vi behandlar</h2>
            <ul className="list-disc pl-6 space-y-1">
                <li><strong>Konto­uppgifter:</strong> namn, e-post, lösenord (hashat), roll (rekryterare/företag/admin), språk­val.</li>
                <li><strong>Profil­uppgifter (rekryterare):</strong> LinkedIn-URL, erfarenhetsnivå, land, godkännande­status.</li>
                <li><strong>Profil­uppgifter (företag):</strong> firmanamn, organisations­nummer, bransch, kontakt­person.</li>
                <li><strong>Kandidat­data:</strong> namn, e-post, telefon, LinkedIn, CV, lönekrav, anställnings­historik, screenings­svar — uppladdade av rekryterare eller via publik ansökningslänk.</li>
                <li><strong>Tekniska uppgifter:</strong> IP-adress, webbläsar­typ, åtkomst­tider (för säkerhet och felsökning).</li>
                <li><strong>Användnings­data:</strong> sidvisningar, klick — endast om du gett samtycke till analys-cookies.</li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">3. Varför vi behandlar uppgifterna (rättslig grund)</h2>
            <ul className="list-disc pl-6 space-y-1">
                <li><strong>Avtals­fullgörande</strong> (art. 6.1.b): för att leverera plattformen — matcha kandidater, hantera placeringar, fakturera.</li>
                <li><strong>Berättigat intresse</strong> (art. 6.1.f): drift, säkerhet, bedrägeri­skydd, kommunikation med användare. Vi har gjort intresse­avvägning och bedömer att vårt intresse väger tyngre än integritets­intrånget.</li>
                <li><strong>Samtycke</strong> (art. 6.1.a): för analys-cookies, ej-nödvändig kommunikation, och kandidatens delning av CV via publik ansöknings­länk. Samtycke kan när som helst återkallas.</li>
                <li><strong>Rättslig förpliktelse</strong> (art. 6.1.c): bokförings­data sparas 7 år enligt bokförings­lagen.</li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">4. Vem vi delar uppgifter med (under­biträden)</h2>
            <p>Vi anlitar följande under­biträden för att leverera tjänsten:</p>
            <ul className="list-disc pl-6 space-y-1">
                <li><strong>Supabase</strong> (databas + auth) — data lagras i EU-region (Frankfurt).</li>
                <li><strong>Vercel</strong> (hosting) — kör koden i EU-region.</li>
                <li><strong>Resend</strong> + <strong>SMTP-leverantör</strong> (transaktionell e-post).</li>
                <li><strong>Sentry</strong> (felövervakning) — endast tekniska felmeddelanden, ingen kandidat­data.</li>
                <li><strong>Anthropic</strong> (AI-assistans för screening och matchning) — endast jobb­beskrivningar och CV-text, ingen kontakt­information.</li>
            </ul>
            <p>
                Vi delar aldrig personuppgifter med tredje part för marknadsförings­ändamål.
                Vid över­föring utanför EU/EES tillämpas EU-kommissionens standard­avtals­klausuler (SCC).
            </p>

            <h2 className="mt-8 text-xl font-semibold">5. Hur länge vi sparar uppgifterna</h2>
            <ul className="list-disc pl-6 space-y-1">
                <li><strong>Aktiva konton:</strong> så länge kontot finns + 30 dagar efter avregistrering.</li>
                <li><strong>Kandidat­data utan placering:</strong> 24 månader från senaste aktivitet, därefter anonymiseras eller raderas.</li>
                <li><strong>Placeringar och fakturering:</strong> 7 år enligt bokförings­lagen (BFL §7).</li>
                <li><strong>Loggar (säkerhet):</strong> 90 dagar.</li>
                <li><strong>Felövervakning (Sentry):</strong> 30 dagar.</li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">6. Dina rättigheter</h2>
            <p>Som registrerad har du rätt att:</p>
            <ul className="list-disc pl-6 space-y-1">
                <li><strong>Få tillgång</strong> till dina uppgifter (art. 15).</li>
                <li><strong>Få felaktiga uppgifter rättade</strong> (art. 16).</li>
                <li><strong>Bli raderad</strong> (art. 17) — med undantag för uppgifter vi måste spara enligt lag (bokförings­data).</li>
                <li><strong>Begränsa behandling</strong> (art. 18) och <strong>invända</strong> mot behandling (art. 21).</li>
                <li><strong>Få ut din data</strong> i ett strukturerat, maskin­läsbart format (art. 20).</li>
                <li><strong>Återkalla samtycke</strong> när som helst, utan att tidigare lovlig behandling påverkas.</li>
            </ul>
            <p>
                Begäran skickas till <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                För inloggade användare finns självbetjänings­funktioner för export och radering
                under Inställningar → Mina data (kommer i nästa uppdatering).
            </p>

            <h2 className="mt-8 text-xl font-semibold">7. Cookies</h2>
            <p>
                Vi använder nödvändiga cookies för inloggning, säkerhet och språkval. Med ditt
                samtycke använder vi även analys-cookies för att förstå hur plattformen används.
                Du väljer i cookie-banner som visas vid första besöket — och kan när som helst
                ändra valet via inställningarna.
            </p>

            <h2 className="mt-8 text-xl font-semibold">8. Säkerhet</h2>
            <p>
                Plattformen drivs med kryptering i transit (TLS 1.3) och i vila (Postgres
                disk-kryptering hos Supabase). Lösenord lagras hashade med bcrypt.
                Administrativ åtkomst loggas. Detaljer finns i vår tekniska och organisatoriska
                beskrivning som ingår som bilaga till biträdes­avtalet (DPA) — kan begäras av
                företags­kunder.
            </p>

            <h2 className="mt-8 text-xl font-semibold">9. Klagomål</h2>
            <p>
                Om du anser att vi behandlar dina uppgifter felaktigt kan du klaga till
                Integritets­skydds­myndigheten (IMY): <a className="underline" href="https://imy.se" target="_blank" rel="noreferrer">imy.se</a>,
                eller telefon 08-657 61 00.
            </p>

            <h2 className="mt-8 text-xl font-semibold">10. Ändringar</h2>
            <p>
                Vi kan uppdatera denna policy. Materiella ändringar meddelas via e-post till
                registrerade användare senast 30 dagar innan de träder i kraft.
            </p>

            <h2 className="mt-8 text-xl font-semibold">11. Kontakt</h2>
            <p>
                Allmänna frågor: <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a><br />
                Integritets­frågor: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
        </>
    );
}

function EnglishPolicy() {
    return (
        <>
            <p>
                Recruito AB ("Recruito", "we") respects your privacy and processes personal
                data in accordance with the EU General Data Protection Regulation (GDPR) and
                Swedish law. This policy describes what data we collect, why, how long we
                keep it, and what rights you have.
            </p>

            <h2 className="mt-8 text-xl font-semibold">1. Data controller</h2>
            <p>
                Recruito AB, Swedish corporate ID [org. number], is the data controller for
                the processing described below. Company customers using the platform to
                recruit are themselves data controllers for the candidate data in their
                pipelines — Recruito then acts as a data processor under a separate Data
                Processing Agreement (DPA).
            </p>
            <p>Contact: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>

            <h2 className="mt-8 text-xl font-semibold">2. What data we process</h2>
            <ul className="list-disc pl-6 space-y-1">
                <li><strong>Account data:</strong> name, email, hashed password, role (recruiter/company/admin), language preference.</li>
                <li><strong>Recruiter profile:</strong> LinkedIn URL, experience level, country, approval status.</li>
                <li><strong>Company profile:</strong> company name, corporate ID, industry, contact person.</li>
                <li><strong>Candidate data:</strong> name, email, phone, LinkedIn, CV, salary expectations, employment history, screening answers — uploaded by recruiters or via public application link.</li>
                <li><strong>Technical data:</strong> IP address, browser type, access times (for security and debugging).</li>
                <li><strong>Usage data:</strong> page views and clicks — only if you have consented to analytics cookies.</li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">3. Why we process data (legal basis)</h2>
            <ul className="list-disc pl-6 space-y-1">
                <li><strong>Performance of contract</strong> (Art. 6.1.b): to deliver the platform — match candidates, manage placements, invoice.</li>
                <li><strong>Legitimate interest</strong> (Art. 6.1.f): operations, security, fraud prevention, user communications. We have performed the balancing test.</li>
                <li><strong>Consent</strong> (Art. 6.1.a): analytics cookies, non-essential communications, candidate consent when sharing CV via public application link. Consent can be withdrawn at any time.</li>
                <li><strong>Legal obligation</strong> (Art. 6.1.c): accounting data is retained for 7 years under the Swedish Accounting Act.</li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">4. Sub-processors</h2>
            <p>We engage the following sub-processors to deliver the service:</p>
            <ul className="list-disc pl-6 space-y-1">
                <li><strong>Supabase</strong> (database + auth) — data stored in EU region (Frankfurt).</li>
                <li><strong>Vercel</strong> (hosting) — code runs in EU region.</li>
                <li><strong>Resend</strong> + <strong>SMTP provider</strong> (transactional email).</li>
                <li><strong>Sentry</strong> (error monitoring) — only technical error data, no candidate PII.</li>
                <li><strong>Anthropic</strong> (AI assistance for screening and matching) — only job descriptions and CV text, no contact details.</li>
            </ul>
            <p>
                We do not share personal data with third parties for marketing. For any
                transfer outside the EU/EEA we use the EU Standard Contractual Clauses (SCC).
            </p>

            <h2 className="mt-8 text-xl font-semibold">5. Retention</h2>
            <ul className="list-disc pl-6 space-y-1">
                <li><strong>Active accounts:</strong> for the lifetime of the account + 30 days after deletion.</li>
                <li><strong>Candidate data without placement:</strong> 24 months from last activity, then anonymized or deleted.</li>
                <li><strong>Placements and invoicing:</strong> 7 years (Swedish Accounting Act §7).</li>
                <li><strong>Security logs:</strong> 90 days.</li>
                <li><strong>Error monitoring (Sentry):</strong> 30 days.</li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">6. Your rights</h2>
            <p>As a data subject you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
                <li><strong>Access</strong> your data (Art. 15).</li>
                <li><strong>Rectification</strong> of incorrect data (Art. 16).</li>
                <li><strong>Erasure</strong> (Art. 17) — except for data we must retain by law (accounting data).</li>
                <li><strong>Restrict processing</strong> (Art. 18) and <strong>object</strong> to processing (Art. 21).</li>
                <li><strong>Data portability</strong> in a structured, machine-readable format (Art. 20).</li>
                <li><strong>Withdraw consent</strong> at any time, without affecting prior lawful processing.</li>
            </ul>
            <p>
                Requests should be sent to <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                Logged-in users will find self-service export and erasure under Settings →
                My data (in the next update).
            </p>

            <h2 className="mt-8 text-xl font-semibold">7. Cookies</h2>
            <p>
                We use necessary cookies for login, security, and language. With your consent
                we also use analytics cookies. You make your choice in the cookie banner
                shown on first visit and can change it at any time in settings.
            </p>

            <h2 className="mt-8 text-xl font-semibold">8. Security</h2>
            <p>
                The platform runs with encryption in transit (TLS 1.3) and at rest (Postgres
                disk encryption at Supabase). Passwords are bcrypt-hashed. Administrative
                access is logged. Details are in our technical and organizational measures
                document, available as an annex to the DPA for company customers.
            </p>

            <h2 className="mt-8 text-xl font-semibold">9. Complaints</h2>
            <p>
                If you believe we process your data unlawfully you may complain to the
                Swedish Authority for Privacy Protection (IMY):
                {" "}<a className="underline" href="https://imy.se" target="_blank" rel="noreferrer">imy.se</a>,
                or call +46 8 657 61 00.
            </p>

            <h2 className="mt-8 text-xl font-semibold">10. Changes</h2>
            <p>
                We may update this policy. Material changes are communicated by email to
                registered users at least 30 days before they take effect.
            </p>

            <h2 className="mt-8 text-xl font-semibold">11. Contact</h2>
            <p>
                General questions: <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a><br />
                Privacy questions: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
        </>
    );
}

export default async function PrivacyPolicyPage() {
    const locale = await getLocale();
    const isEnglish = locale === "en";

    return (
        <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">
                    {isEnglish ? "Privacy Policy" : "Integritetspolicy"}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {isEnglish ? `Last updated: ${LAST_UPDATED}` : `Senast uppdaterad: ${LAST_UPDATED}`}
                </p>
            </header>

            <DraftBanner locale={locale} />

            <article className="space-y-3 text-sm leading-6">
                {isEnglish ? <EnglishPolicy /> : <SwedishPolicy />}
            </article>

            <footer className="pt-4 border-t text-sm">
                <Link href="/gdpr" className="underline hover:text-gray-900">
                    {isEnglish ? "Read more about GDPR" : "Läs mer om GDPR-rättigheter"}
                </Link>
                {" · "}
                <Link href="/anvandarvillkor" className="underline hover:text-gray-900">
                    {isEnglish ? "Terms of Service" : "Användarvillkor"}
                </Link>
            </footer>
        </main>
    );
}
