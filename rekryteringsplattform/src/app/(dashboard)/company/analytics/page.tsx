import { getCompanyAnalytics } from "@/lib/actions/company";
import { getDictionary } from "@/i18n/server";
import { AnalyticsDashboard } from "@/components/dashboard/company/analytics-dashboard";

export default async function CompanyAnalyticsPage() {
    const [analytics, dict] = await Promise.all([
        getCompanyAnalytics(),
        getDictionary(),
    ]);

    return <AnalyticsDashboard analytics={analytics} dict={dict} />;
}
