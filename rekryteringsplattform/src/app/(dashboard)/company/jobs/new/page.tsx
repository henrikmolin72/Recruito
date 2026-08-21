import { getCompanyPlacementCountRecent, getCompanyProfile } from "@/lib/actions/company";
import { getFeePercentage } from "@/lib/pricing";
import { INDUSTRY_OPTIONS } from "@/lib/job-form-options";
import { CreateJobForm } from "./create-job-form";

export default async function CreateJobPage() {
    const [recentPlacements, { company }] = await Promise.all([
        getCompanyPlacementCountRecent(),
        getCompanyProfile(),
    ]);
    const feePercentage = getFeePercentage(recentPlacements);

    // Pre-fill the job's industry from the company's signup industry (still
    // editable). Only when it's a canonical option, so the <select> has a
    // matching value; legacy/free-text industries fall back to the empty picker.
    const signupIndustry = company?.industry ?? "";
    const initialIndustry = (INDUSTRY_OPTIONS as readonly string[]).includes(signupIndustry)
        ? signupIndustry
        : undefined;

    return (
        <CreateJobForm
            feePercentage={feePercentage}
            initialData={initialIndustry ? { industry: initialIndustry } : undefined}
        />
    );
}
