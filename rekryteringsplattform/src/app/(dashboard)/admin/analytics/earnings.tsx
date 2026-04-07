"use client";

import { useEffect, useState } from "react";
import { getEarningsAnalytics } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendCard } from "@/components/dashboard/admin/trend-card";
import { MetricGrid } from "@/components/dashboard/admin/metric-grid";
import { TrendingUp, BarChart3, PieChart } from "lucide-react";

interface EarningsAnalyticsProps {
    timeRange: string;
}

export default function EarningsAnalytics({ timeRange }: EarningsAnalyticsProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await getEarningsAnalytics(timeRange);
                setData(result);
            } catch (error) {
                console.error("Error fetching earnings analytics:", error);
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

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("sv-SE", {
            style: "currency",
            currency: "SEK",
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <MetricGrid cols={4}>
                <TrendCard
                    title="Total Revenue"
                    value={formatCurrency(data.stats.totalRevenue)}
                    description="Platform earnings"
                    icon={<TrendingUp className="h-8 w-8" />}
                />
                <TrendCard
                    title="Recruiter Payouts"
                    value={formatCurrency(data.stats.recruiterPayouts)}
                    description="Paid to recruiters"
                />
                <TrendCard
                    title="Platform Fee"
                    value={formatCurrency(data.stats.platformFee)}
                    description="Net platform earnings"
                />
                <TrendCard
                    title="Avg Fee per Placement"
                    value={formatCurrency(data.stats.avgFeePerPlacement)}
                    description="Average fee collected"
                />
            </MetricGrid>

            {/* Revenue Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Daily Revenue Trend
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-2 font-semibold">Date</th>
                                    <th className="text-right py-2 px-2 font-semibold">Revenue</th>
                                    <th className="text-right py-2 px-2 font-semibold">Placements</th>
                                    <th className="text-right py-2 px-2 font-semibold">Avg Fee</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.dailyRevenue.map((day: any, idx: number) => (
                                    <tr key={idx} className="border-b hover:bg-slate-50">
                                        <td className="py-2 px-2">{new Date(day.date).toLocaleDateString("sv-SE")}</td>
                                        <td className="text-right py-2 px-2 font-medium">{formatCurrency(day.revenue)}</td>
                                        <td className="text-right py-2 px-2">{day.placements}</td>
                                        <td className="text-right py-2 px-2">
                                            {day.placements > 0 ? formatCurrency(day.revenue / day.placements) : "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Top Revenue Sources */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5" />
                        Top Revenue Sources
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-2 font-semibold">Recruiter</th>
                                    <th className="text-right py-2 px-2 font-semibold">Revenue</th>
                                    <th className="text-right py-2 px-2 font-semibold">Placements</th>
                                    <th className="text-right py-2 px-2 font-semibold">% of Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topSources.map((source: any, idx: number) => (
                                    <tr key={idx} className="border-b hover:bg-slate-50">
                                        <td className="py-2 px-2 font-medium">{source.recruiterName}</td>
                                        <td className="text-right py-2 px-2">{formatCurrency(source.revenue)}</td>
                                        <td className="text-right py-2 px-2">{source.placements}</td>
                                        <td className="text-right py-2 px-2">
                                            {data.stats.totalRevenue > 0 ? ((source.revenue / data.stats.totalRevenue) * 100).toFixed(1) : 0}%
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
