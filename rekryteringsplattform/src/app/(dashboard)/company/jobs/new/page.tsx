import { getCompanyPlacementCountRecent } from "@/lib/actions/company";
import { getFeePercentage } from "@/lib/pricing";
import { CreateJobForm } from "./create-job-form";

export default async function CreateJobPage() {
    const recentPlacements = await getCompanyPlacementCountRecent();
    const feePercentage = getFeePercentage(recentPlacements);

    return (
        <CreateJobForm
            feePercentage={feePercentage}
        />
    );
}
