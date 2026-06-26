import { getDictionary } from "@/i18n/server";
import { AiPolicyContent } from "@/components/compliance/ai-policy-content";

export default async function RecruiterAiPolicyPage() {
    await getDictionary();

    return (
        <div className="space-y-6">
            <AiPolicyContent role="recruiter" />
        </div>
    );
}
