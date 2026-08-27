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

    // The job's industry is FIXED to the company's signup industry when it's a
    // canonical option (createJob enforces the same rule server-side). Legacy/
    // free-text industries fall back to the editable empty picker.
    const signupIndustry = company?.industry ?? "";
    const initialIndustry = (INDUSTRY_OPTIONS as readonly string[]).includes(signupIndustry)
        ? signupIndustry
        : undefined;

    return (
        <CreateJobForm
            feePercentage={feePercentage}
            initialData={initialIndustry ? { industry: initialIndustry } : undefined}
            industryLocked={Boolean(initialIndustry)}
        />
    );
}
