import { DataRightsActions } from "@/components/dashboard/data-rights-actions";

export const metadata = { title: "Mina data — Recruito" };

export default function CompanyDataRightsPage() {
    return (
        <main className="max-w-3xl mx-auto px-6 py-10">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">Mina data</h1>
                <p className="text-sm text-gray-600">
                    Hantera dina rättigheter enligt GDPR — exportera all data vi har om dig
                    eller begär att företagskontot raderas. För radering av kandidatdata som
                    företaget behandlar enligt biträdesavtal, kontakta{" "}
                    <a href="mailto:privacy@recruito.eu" className="underline">privacy@recruito.eu</a>.
                </p>
            </header>
            <div className="mt-8">
                <DataRightsActions />
            </div>
        </main>
    );
}
