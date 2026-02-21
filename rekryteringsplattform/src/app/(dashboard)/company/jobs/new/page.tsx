import { getCompanyPlacementCountRecent } from "@/lib/actions/company";
import { getFeePercentage, getTierForPlacementCount } from "@/lib/pricing";
import { createTranslator } from "@/i18n/server";
import { CreateJobForm } from "./create-job-form";

export default async function CreateJobPage() {
    const recentPlacements = await getCompanyPlacementCountRecent();
    const feePercentage = getFeePercentage(recentPlacements);
    const tier = getTierForPlacementCount(recentPlacements);
    const t = await createTranslator();

    return (
        <CreateJobForm
            feePercentage={feePercentage}
            tierLabel={t(tier.labelKey)}
        />
    );
}
