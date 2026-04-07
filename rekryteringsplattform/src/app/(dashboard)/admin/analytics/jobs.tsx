"use client";

import { useEffect, useState } from "react";
import { getJobAnalytics } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendCard } from "@/components/dashboard/admin/trend-card";
import { MetricGrid } from "@/components/dashboard/admin/metric-grid";
import { Briefcase, BarChart3 } from "lucide-react";

interface JobAnalyticsProps {
    timeRange: string;
}

export default function JobAnalytics({ timeRange }: JobAnalyticsProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await getJobAnalytics(timeRange);
                setData(result);
            } catch (error) {
                console.error("Error fetching job analytics:", error);
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
                    title="Total Jobs"
                    value={data.stats.total}
                    description="Job postings in period"
                    icon={<Briefcase className="h-8 w-8" />}
                />
                <TrendCard
                    title="Active Jobs"
                    value={data.stats.active}
                    description="Currently recruiting"
                />
                <TrendCard
                    title="Jobs Filled"
                    value={data.stats.filled}
                    description={`${data.stats.fillRate.toFixed(1)}% fill rate`}
                />
            </MetricGrid>

            {/* Job Status Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Status Distribution
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Object.entries(data.byStatus).map(([status, count]: [string, any]) => (
                            <div key={status} className="flex items-center justify-between">
                                <span className="capitalize text-sm font-medium">{status}</span>
                                <div className="flex items-center gap-2 flex-1 ml-4">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-brand-600"
                                            style={{
                                                width: `${Math.max(data.stats.total > 0 ? (count / data.stats.total) * 100 : 0, 5)}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold text-right w-8">{count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Jobs by Industry */}
            <Card>
                <CardHeader>
                    <CardTitle>By Industry</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-2 font-semibold">Industry</th>
                                    <th className="text-right py-2 px-2 font-semibold">Count</th>
                                    <th className="text-right py-2 px-2 font-semibold">% of Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.byIndustry.map((industry: any, idx: number) => (
                                    <tr key={idx} className="border-b hover:bg-slate-50">
                                        <td className="py-2 px-2">{industry.industry}</td>
                                        <td className="text-right py-2 px-2 font-medium">{industry.count}</td>
                                        <td className="text-right py-2 px-2">
                                            {data.stats.total > 0 ? ((industry.count / data.stats.total) * 100).toFixed(1) : 0}%
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
