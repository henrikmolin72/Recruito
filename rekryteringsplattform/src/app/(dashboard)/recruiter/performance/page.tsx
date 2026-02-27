import { getRecruiterPerformance } from "@/lib/actions/recruiter";
import { RecruiterPerformanceDashboard } from "@/components/dashboard/recruiter/performance-dashboard";

export default async function RecruiterPerformancePage() {
    const performance = await getRecruiterPerformance();

    return <RecruiterPerformanceDashboard data={performance} />;
}
