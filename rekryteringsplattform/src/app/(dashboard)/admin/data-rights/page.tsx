import { getPendingDataRightsRequests } from "@/lib/actions/data-rights";
import { AdminDataRightsRow } from "@/components/dashboard/admin-data-rights-row";

export const metadata = { title: "DSR-kö — Recruito Admin" };
export const dynamic = "force-dynamic";

export default async function AdminDataRightsPage() {
    const rows = await getPendingDataRightsRequests();

    return (
        <main className="px-6 py-8">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">Data-rights-förfrågningar</h1>
                <p className="text-sm text-gray-600">
                    GDPR Art. 17 (radering) och Art. 20 (export). Måste behandlas inom 30 dagar
                    från inkommen begäran. Att markera klar betyder att åtgärden är utförd —
                    för raderingar måste du först köra anonymisering av kandidat/konto separat.
                </p>
            </header>

            <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Inkommen</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Typ</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Subjekt</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Anledning</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Åtgärd</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-500">
                                    Inga öppna förfrågningar.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row: any) => (
                                <AdminDataRightsRow
                                    key={row.id}
                                    row={{
                                        ...row,
                                        subject_profile: Array.isArray(row.subject_profile)
                                            ? row.subject_profile[0]
                                            : row.subject_profile,
                                    }}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
