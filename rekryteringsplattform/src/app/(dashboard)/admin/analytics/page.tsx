"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeRangeSelector } from "@/components/dashboard/admin/time-range-selector";
import { BarChart3, Users, Briefcase, TrendingUp, Building2 } from "lucide-react";
import RecruiterAnalytics from "./recruiters";
import JobAnalytics from "./jobs";
import CandidateAnalytics from "./candidates";
import CompanyAnalytics from "./companies";
import EarningsAnalytics from "./earnings";

export default function AnalyticsPage() {
    const [timeRange, setTimeRange] = useState("90d");

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
                    <p className="text-slate-600">Platform metrics and insights</p>
                </div>
                <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="recruiters" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="recruiters" className="flex items-center gap-2">
                        <Users className="h-4 w-4 hidden sm:block" />
                        <span className="hidden sm:inline">Recruiters</span>
                        <span className="sm:hidden">Rec.</span>
                    </TabsTrigger>
                    <TabsTrigger value="jobs" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 hidden sm:block" />
                        <span className="hidden sm:inline">Jobs</span>
                        <span className="sm:hidden">Job</span>
                    </TabsTrigger>
                    <TabsTrigger value="candidates" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 hidden sm:block" />
                        <span className="hidden sm:inline">Candidates</span>
                        <span className="sm:hidden">Cand.</span>
                    </TabsTrigger>
                    <TabsTrigger value="companies" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 hidden sm:block" />
                        <span className="hidden sm:inline">Companies</span>
                        <span className="sm:hidden">Co.</span>
                    </TabsTrigger>
                    <TabsTrigger value="earnings" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 hidden sm:block" />
                        <span className="hidden sm:inline">Earnings</span>
                        <span className="sm:hidden">Earn</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="recruiters" className="space-y-6">
                    <RecruiterAnalytics timeRange={timeRange} />
                </TabsContent>

                <TabsContent value="jobs" className="space-y-6">
                    <JobAnalytics timeRange={timeRange} />
                </TabsContent>

                <TabsContent value="candidates" className="space-y-6">
                    <CandidateAnalytics timeRange={timeRange} />
                </TabsContent>

                <TabsContent value="companies" className="space-y-6">
                    <CompanyAnalytics timeRange={timeRange} />
                </TabsContent>

                <TabsContent value="earnings" className="space-y-6">
                    <EarningsAnalytics timeRange={timeRange} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
