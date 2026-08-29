import { getCompanyProfile } from "@/lib/actions/company";
import { INDUSTRY_OPTIONS } from "@/lib/job-form-options";
import { CreateJobForm } from "./create-job-form";

export default async function CreateJobPage() {
    const { company } = await getCompanyProfile();

    // The job's industry is FIXED to the company's signup industry when it's a
    // canonical option (createJob enforces the same rule server-side). Legacy/
    // free-text industries fall back to the editable empty picker.
    const signupIndustry = company?.industry ?? "";
    const initialIndustry = (INDUSTRY_OPTIONS as readonly string[]).includes(signupIndustry)
        ? signupIndustry
        : undefined;

    return (
        <CreateJobForm
            initialData={initialIndustry ? { industry: initialIndustry } : undefined}
            industryLocked={Boolean(initialIndustry)}
        />
    );
}
