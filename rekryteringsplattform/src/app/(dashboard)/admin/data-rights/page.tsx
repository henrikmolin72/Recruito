import { getPendingDataRightsRequests } from "@/lib/actions/data-rights";
import { AdminDataRightsRow } from "@/components/dashboard/admin-data-rights-row";
import { createTranslator } from "@/i18n/server";

export async function generateMetadata() {
    const t = await createTranslator();
    return { title: t("admin.dsrPageTitleMeta") };
}
export const dynamic = "force-dynamic";

export default async function AdminDataRightsPage() {
    const rows = await getPendingDataRightsRequests();
    const t = await createTranslator();

    return (
        <main className="px-6 py-8">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">{t("admin.dsrPageHeading")}</h1>
                <p className="text-sm text-gray-600">
                    {t("admin.dsrPageIntro")}
                </p>
            </header>

            <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">{t("admin.dsrColReceived")}</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">{t("admin.dsrColType")}</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">{t("admin.dsrColSubject")}</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">{t("admin.dsrColReason")}</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">{t("admin.dsrColAction")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-500">
                                    {t("admin.dsrNoOpenRequests")}
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
