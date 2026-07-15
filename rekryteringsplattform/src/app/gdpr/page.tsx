import Link from "next/link";
import { getLocale } from "@/i18n/server";

// GDPR rights page — practical companion to integritetspolicy. Tells the user
// HOW to exercise their rights and what we do internally to protect data.

const LAST_UPDATED = "2026-05-14";
const PRIVACY_EMAIL = "privacy@recruitomatch.com";

function DraftBanner({ locale }: { locale: string }) {
    const text = locale === "en"
        ? "Version 1 — under external legal review."
        : "Version 1 — under extern juridisk granskning.";
    return (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {text}
        </div>
    );
}

function SwedishGdpr() {
    return (
        <>
            <p>
                GDPR (General Data Protection Regulation) är EU:s dataskydds­förordning som
                ger dig rättigheter kring hur personuppgifter om dig får behandlas. Den här
                sidan förklarar hur Recruito uppfyller GDPR och hur du utövar dina
                rättigheter.
            </p>

            <h2 className="mt-8 text-xl font-semibold">Recruitos roll: ansvarig eller biträde?</h2>
            <p>
                Recruito har två roller beroende på vilken data det handlar om:
            </p>
            <ul className="list-disc pl-6 space-y-1">
                <li>
                    <strong>Personuppgifts­ansvarig</strong> för konto­data (rekryterare,
                    företags­kontakter, admin) — vi bestämmer själva varför och hur dessa
                    uppgifter behandlas.
                </li>
                <li>
                    <strong>Personuppgifts­biträde</strong> för kandidat­data när företags­kunder
                    behandlar kandidater i sin pipeline — företaget är ansvarig, vi följer deras
                    instruktioner enligt biträdes­avtal (DPA).
                </li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">Så utövar du dina rättigheter</h2>
            <p>
                <strong>Inloggade användare:</strong> Inställningar → Mina data (kommer i
                nästa uppdatering). Du kan ladda ner all data om dig som JSON, eller begära
                radering av kontot.
            </p>
            <p>
                <strong>Kandidater som ansökt via publik länk:</strong> e-posta{" "}
                <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>{" "}
                från samma adress du använde i ansökan. Vi svarar inom 30 dagar (GDPR art. 12.3).
            </p>
            <p>
                <strong>Övriga frågor:</strong> samma adress. Inkludera tillräcklig information
                så vi kan identifiera dig och vilken data du syftar på.
            </p>

            <h2 className="mt-8 text-xl font-semibold">Vad händer vid radering?</h2>
            <p>
                När en raderings­begäran godkänns:
            </p>
            <ul className="list-disc pl-6 space-y-1">
                <li>Personuppgifter anonymiseras eller raderas inom 30 dagar.</li>
                <li>
                    Data kopplad till en faktisk placering (faktura, anställnings­bevis) sparas
                    7 år enligt bokförings­lagen i pseudonymiserad form — vi kan inte ta bort
                    den men kopplingen till dig kapas.
                </li>
                <li>Säkerhetsloggar med din IP-adress raderas efter 90 dagar oavsett.</li>
                <li>Tredjeparts­tjänster (Resend, Sentry) får motsvarande raderings­begäran.</li>
                <li>Raderingen loggas i intern audit-tabell utan personuppgifter.</li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">Tekniska och organisatoriska åtgärder (TOMs)</h2>
            <ul className="list-disc pl-6 space-y-1">
                <li>All trafik krypteras med TLS 1.3.</li>
                <li>Data i vila krypteras på diskar­na hos Supabase (AES-256).</li>
                <li>Lösenord lagras hashade med bcrypt (cost ≥ 10).</li>
                <li>Row Level Security (RLS) på databas­nivå begränsar åtkomst per användare.</li>
                <li>Admin-konton skyddas av separat behörighet och loggas separat.</li>
                <li>Backup tas dagligen, behålls 7 dagar (PITR), testas kvartalsvis.</li>
                <li>Tillgång till produktions­data begränsad till tekniskt drift­team.</li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">Personuppgifts­incident</h2>
            <p>
                Om vi upptäcker en personuppgifts­incident anmäler vi den till IMY inom 72
                timmar (art. 33). Drabbade användare informeras direkt om incidenten innebär
                hög risk för deras rättigheter (art. 34). Du kan rapportera misstänkt incident
                till <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
            </p>

            <h2 className="mt-8 text-xl font-semibold">Kontakt och klagomål</h2>
            <p>
                Frågor om GDPR: <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
            </p>
            <p>
                Om vi inte hanterar din begäran inom 30 dagar, eller om du är missnöjd med
                svaret, kan du klaga till{" "}
                <a className="underline" href="https://imy.se" target="_blank" rel="noreferrer">
                    Integritetsskyddsmyndigheten (IMY)
                </a>.
            </p>
        </>
    );
}

function EnglishGdpr() {
    return (
        <>
            <p>
                GDPR (General Data Protection Regulation) is the EU regulation that grants
                you rights over how personal data about you may be processed. This page
                explains how Recruito complies with GDPR and how you exercise your rights.
            </p>

            <h2 className="mt-8 text-xl font-semibold">Recruito&apos;s role: controller or processor?</h2>
            <p>Recruito has two roles depending on which data is concerned:</p>
            <ul className="list-disc pl-6 space-y-1">
                <li>
                    <strong>Data controller</strong> for account data (recruiters, company
                    contacts, admins) — we determine why and how this data is processed.
                </li>
                <li>
                    <strong>Data processor</strong> for candidate data when company customers
                    process candidates in their pipeline — the company is controller, we act
                    on their instructions under a Data Processing Agreement (DPA).
                </li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">How to exercise your rights</h2>
            <p>
                <strong>Logged-in users:</strong> Settings → My data (coming in the next
                update). Download all your data as JSON, or request account deletion.
            </p>
            <p>
                <strong>Candidates who applied via a public link:</strong> email{" "}
                <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>{" "}
                from the same address used in the application. We respond within 30 days
                (GDPR Art. 12.3).
            </p>
            <p>
                <strong>Other questions:</strong> same email. Include enough information to
                identify you and the data you mean.
            </p>

            <h2 className="mt-8 text-xl font-semibold">What happens on erasure?</h2>
            <p>When an erasure request is approved:</p>
            <ul className="list-disc pl-6 space-y-1">
                <li>Personal data is anonymized or deleted within 30 days.</li>
                <li>
                    Data tied to an actual placement (invoice, employment record) is kept for
                    7 years under the Swedish Accounting Act in pseudonymized form — we cannot
                    delete it but the link to you is broken.
                </li>
                <li>Security logs containing your IP are deleted after 90 days regardless.</li>
                <li>Third-party services (Resend, Sentry) receive an equivalent deletion request.</li>
                <li>The erasure is logged in an internal audit table without personal data.</li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">Technical and Organizational Measures (TOMs)</h2>
            <ul className="list-disc pl-6 space-y-1">
                <li>All traffic encrypted with TLS 1.3.</li>
                <li>Data at rest encrypted on Supabase disks (AES-256).</li>
                <li>Passwords stored bcrypt-hashed (cost ≥ 10).</li>
                <li>Row Level Security (RLS) at the database layer restricts per-user access.</li>
                <li>Admin accounts use separate authorization and are logged separately.</li>
                <li>Daily backups retained 7 days (PITR), tested quarterly.</li>
                <li>Production data access limited to the technical operations team.</li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">Personal data breach</h2>
            <p>
                If we detect a personal data breach we notify IMY within 72 hours (Art. 33).
                Affected users are notified directly if the breach is likely to result in
                a high risk to their rights (Art. 34). Report a suspected breach to{" "}
                <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
            </p>

            <h2 className="mt-8 text-xl font-semibold">Contact and complaints</h2>
            <p>
                GDPR questions: <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
            </p>
            <p>
                If we do not handle your request within 30 days, or if you are dissatisfied
                with our response, you may complain to the{" "}
                <a className="underline" href="https://imy.se" target="_blank" rel="noreferrer">
                    Swedish Authority for Privacy Protection (IMY)
                </a>.
            </p>
        </>
    );
}

export default async function GdprPage() {
    const locale = await getLocale();
    const isEnglish = locale === "en";

    return (
        <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">
                    {isEnglish ? "GDPR — Your data rights" : "GDPR — Dina rättigheter"}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {isEnglish ? `Last updated: ${LAST_UPDATED}` : `Senast uppdaterad: ${LAST_UPDATED}`}
                </p>
            </header>

            <DraftBanner locale={locale} />

            <article className="space-y-3 text-sm leading-6">
                {isEnglish ? <EnglishGdpr /> : <SwedishGdpr />}
            </article>

            <footer className="pt-4 border-t text-sm">
                <Link href="/integritetspolicy" className="underline hover:text-gray-900">
                    {isEnglish ? "Privacy Policy" : "Integritetspolicy"}
                </Link>
                {" · "}
                <Link href="/anvandarvillkor" className="underline hover:text-gray-900">
                    {isEnglish ? "Terms of Service" : "Användarvillkor"}
                </Link>
            </footer>
        </main>
    );
}
