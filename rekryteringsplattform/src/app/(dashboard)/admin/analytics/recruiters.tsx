"use client";

import { useEffect, useState } from "react";
import { getRecruiterAnalytics } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendCard } from "@/components/dashboard/admin/trend-card";
import { MetricGrid } from "@/components/dashboard/admin/metric-grid";
import { Users, TrendingUp } from "lucide-react";

export default function RecruiterAnalytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await getRecruiterAnalytics();
                setData(result);
            } catch (error) {
                console.error("Error fetching recruiter analytics:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-32 bg-slate-100 rounded-lg animate-pulse" />
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
            <p className="text-xs text-slate-500">
                Lifetime figures — recruiter performance is cumulative and not affected by the date range above.
            </p>

            {/* Key Metrics */}
            <MetricGrid cols={4}>
                <TrendCard
                    title="Total Recruiters"
                    value={data.counts.total}
                    description="Active recruiters on platform"
                    icon={<Users className="h-8 w-8" />}
                />
                <TrendCard
                    title="Approved"
                    value={data.counts.approved}
                    description="Active & verified recruiters"
                />
                <TrendCard
                    title="Pending Approval"
                    value={data.counts.pending}
                    description="Awaiting verification"
                />
                <TrendCard
                    title="Avg Hire Rate"
                    value={`${(data.averages.hireRate * 100).toFixed(1)}%`}
                    description="Percentage of submissions hired"
                />
            </MetricGrid>

            <MetricGrid cols={4}>
                <TrendCard
                    title="Avg Time to Hire"
                    value={`${Math.round(data.averages.timeToHire)} days`}
                    description="Average hiring duration"
                />
                <TrendCard
                    title="Guarantee Success Rate"
                    value={`${(data.averages.guaranteeSuccessRate * 100).toFixed(1)}%`}
                    description="Successful placements"
                />
            </MetricGrid>

            {/* All Recruiters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        All Recruiters ({data.topRecruiters.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {data.topRecruiters.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No recruiters found</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="text-left py-2 px-2 font-semibold">Name</th>
                                        <th className="text-right py-2 px-2 font-semibold">Hire Rate</th>
                                        <th className="text-right py-2 px-2 font-semibold">Submitted</th>
                                        <th className="text-right py-2 px-2 font-semibold">Hired</th>
                                        <th className="text-right py-2 px-2 font-semibold">Time to Hire</th>
                                        <th className="text-right py-2 px-2 font-semibold">Earnings</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.topRecruiters.map((recruiter: any) => (
                                        <tr key={recruiter.id} className="border-b hover:bg-slate-50 transition-colors">
                                            <td className="py-2 px-2 font-medium">{recruiter.name}</td>
                                            <td className="text-right py-2 px-2 font-semibold text-emerald-600">{(recruiter.hireRate * 100).toFixed(1)}%</td>
                                            <td className="text-right py-2 px-2">{recruiter.submitted}</td>
                                            <td className="text-right py-2 px-2 font-medium">{recruiter.hired}</td>
                                            <td className="text-right py-2 px-2">{Math.round(recruiter.timeToHire)} days</td>
                                            <td className="text-right py-2 px-2 font-semibold text-emerald-700">{recruiter.earnings.toLocaleString()} kr</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
