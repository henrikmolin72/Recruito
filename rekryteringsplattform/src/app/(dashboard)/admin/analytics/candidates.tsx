"use client";

import { useEffect, useState } from "react";
import { getCandidateAnalytics } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendCard } from "@/components/dashboard/admin/trend-card";
import { MetricGrid } from "@/components/dashboard/admin/metric-grid";
import { Users, BarChart3 } from "lucide-react";

interface CandidateAnalyticsProps {
    timeRange: string;
}

export default function CandidateAnalytics({ timeRange }: CandidateAnalyticsProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await getCandidateAnalytics(timeRange);
                setData(result);
            } catch (error) {
                console.error("Error fetching candidate analytics:", error);
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
                    title="Total Candidates"
                    value={data.stats.total}
                    description="Submitted in period"
                    icon={<Users className="h-8 w-8" />}
                />
                <TrendCard
                    title="Conversion to Hire"
                    value={`${(data.stats.conversionRate * 100).toFixed(1)}%`}
                    description="Submitted to hired"
                />
                <TrendCard
                    title="Avg Pipeline Duration"
                    value={`${Math.round(data.stats.avgDuration)} days`}
                    description="From submit to hire"
                />
                <TrendCard
                    title="Offer Acceptance Rate"
                    value={`${(data.stats.offerAcceptanceRate * 100).toFixed(1)}%`}
                    description="Offers accepted"
                />
            </MetricGrid>

            {/* Stage Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Pipeline Stage Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-2 font-semibold">Stage</th>
                                    <th className="text-right py-2 px-2 font-semibold">Count</th>
                                    <th className="text-right py-2 px-2 font-semibold">% of Total</th>
                                    <th className="text-right py-2 px-2 font-semibold">Avg Days</th>
                                    <th className="text-right py-2 px-2 font-semibold">Conversion Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.byStage.map((stage: any, idx: number) => (
                                    <tr key={idx} className="border-b hover:bg-slate-50">
                                        <td className="py-2 px-2 capitalize font-medium">{stage.stage}</td>
                                        <td className="text-right py-2 px-2">{stage.count}</td>
                                        <td className="text-right py-2 px-2">
                                            {data.stats.total > 0 ? ((stage.count / data.stats.total) * 100).toFixed(1) : 0}%
                                        </td>
                                        <td className="text-right py-2 px-2">{Math.round(stage.avgDays)}</td>
                                        <td className="text-right py-2 px-2 font-medium">
                                            {(stage.conversionRate * 100).toFixed(1)}%
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
