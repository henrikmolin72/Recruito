import { getCompanyPlacementCountRecent } from "@/lib/actions/company";
import { getCompanyJobLimitInfo } from "@/lib/actions/jobs";
import { getFeePercentage, getTierForPlacementCount } from "@/lib/pricing";
import { createTranslator, getDictionary } from "@/i18n/server";
import { CreateJobForm } from "./create-job-form";
import { redirect } from "next/navigation";

export default async function CreateJobPage() {
    const [recentPlacements, limitInfo] = await Promise.all([
        getCompanyPlacementCountRecent(),
        getCompanyJobLimitInfo(),
    ]);

    // Block access if at job posting limit
    if (limitInfo?.atLimit) {
        redirect("/company/jobs");
    }

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
