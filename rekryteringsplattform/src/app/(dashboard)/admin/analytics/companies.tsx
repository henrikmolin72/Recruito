"use client";

import { useEffect, useState } from "react";
import { getCompanyAnalytics } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendCard } from "@/components/dashboard/admin/trend-card";
import { MetricGrid } from "@/components/dashboard/admin/metric-grid";
import { Building2, TrendingUp } from "lucide-react";

interface CompanyAnalyticsProps {
    timeRange: string;
}

export default function CompanyAnalytics({ timeRange }: CompanyAnalyticsProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await getCompanyAnalytics(timeRange);
                setData(result);
            } catch (error) {
                console.error("Error fetching company analytics:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [timeRange]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (!data) {
        return <div className="text-center py-8 text-slate-500">No data available</div>;
    }

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <MetricGrid cols={4}>
                <TrendCard
                    title="Total Companies"
                    value={data.stats.total}
                    description="Active companies"
                    icon={<Building2 className="h-8 w-8" />}
                />
                <TrendCard
                    title="New Companies"
                    value={data.stats.newCompanies}
                    description="In this period"
                />
                <TrendCard
                    title="Avg Jobs per Company"
                    value={data.stats.avgJobsPerCompany.toFixed(1)}
                    description="Average posting frequency"
                />
                <TrendCard
                    title="Companies w/ Active Jobs"
                    value={data.stats.companiesWithActiveJobs}
                    description={`${((data.stats.companiesWithActiveJobs / data.stats.total) * 100).toFixed(1)}% active`}
                />
            </MetricGrid>

            {/* Top Companies */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Top Companies
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-2 font-semibold">Company</th>
                                    <th className="text-right py-2 px-2 font-semibold">Jobs Posted</th>
                                    <th className="text-right py-2 px-2 font-semibold">Active Jobs</th>
                                    <th className="text-right py-2 px-2 font-semibold">Filled</th>
                                    <th className="text-right py-2 px-2 font-semibold">Fill Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topCompanies.map((company: any, idx: number) => (
                                    <tr key={idx} className="border-b hover:bg-slate-50">
                                        <td className="py-2 px-2 font-medium">{company.name}</td>
                                        <td className="text-right py-2 px-2">{company.totalJobs}</td>
                                        <td className="text-right py-2 px-2">{company.activeJobs}</td>
                                        <td className="text-right py-2 px-2">{company.filledJobs}</td>
                                        <td className="text-right py-2 px-2 font-medium">
                                            {company.totalJobs > 0 ? ((company.filledJobs / company.totalJobs) * 100).toFixed(1) : 0}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
