import { DataRightsActions } from "@/components/dashboard/data-rights-actions";
import { createTranslator } from "@/i18n/server";

export async function generateMetadata() {
    const t = await createTranslator();
    return { title: t("common.myDataTitleMeta") };
}

export default async function RecruiterDataRightsPage() {
    const t = await createTranslator();
    return (
        <main className="max-w-3xl mx-auto px-6 py-10">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">{t("common.myDataHeading")}</h1>
                <p className="text-sm text-gray-600">
                    {t("common.dataRightsRecruiterIntro")}
                </p>
            </header>
            <div className="mt-8">
                <DataRightsActions />
            </div>
        </main>
    );
}
