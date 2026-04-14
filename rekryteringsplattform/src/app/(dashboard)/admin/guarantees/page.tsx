import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ActiveGuaranteesDashboard } from "@/components/guarantee/active-guarantees-dashboard";
import { GuaranteeBreachReviewList } from "@/components/guarantee/breach-review-list";

async function getGuaranteeData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return null;

    const { data: placements } = await admin
        .from("placements")
        .select(`
            id, total_fee, salary_currency, guarantee_end_date, status,
            candidate:candidates(first_name, last_name),
            company:companies(company_name),
            job:jobs(title)
        `)
        .eq("status", "guarantee_active")
        .not("guarantee_end_date", "is", null)
        .order("guarantee_end_date", { ascending: true });

    const { data: breachReports } = await admin
        .from("guarantee_breach_reports")
        .select(`
            id, reason, notes, end_date, refund_amount, refund_currency,
            admin_status, created_at,
            placement:placements(
                id, total_fee, salary_currency,
                candidate:candidates(first_name, last_name),
                job:jobs(title),
                company:companies(company_name)
            )
        `)
        .order("created_at", { ascending: false });

    return { placements: placements ?? [], breachReports: breachReports ?? [] };
}

export default async function AdminGuaranteesPage() {
    const data = await getGuaranteeData();
    if (!data) notFound();

    const guarantees = data.placements.map((p: any) => {
        const candidate = Array.isArray(p.candidate) ? p.candidate[0] : p.candidate;
        const company = Array.isArray(p.company) ? p.company[0] : p.company;
        const job = Array.isArray(p.job) ? p.job[0] : p.job;
        return {
            id: p.id,
            candidateName: candidate ? `${candidate.first_name} ${candidate.last_name}` : "—",
            companyName: company?.company_name ?? "—",
            jobTitle: job?.title ?? "—",
            guaranteeEndDate: p.guarantee_end_date,
            totalFee: p.total_fee,
            currency: p.salary_currency ?? "SEK",
            status: p.status,
        };
    });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Shield className="h-6 w-6 text-brand-600" />
                    Active Guarantees
                </h1>
                <p className="text-muted-foreground mt-1">
                    Real-time overview of all placements in their guarantee period
                </p>
            </div>

            <Card className="border-none shadow-xl shadow-slate-200/50">
                <CardContent className="p-6 space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
                        Active Guarantees ({guarantees.length})
                    </h2>
                    <ActiveGuaranteesDashboard guarantees={guarantees} />
                </CardContent>
            </Card>

            {data.breachReports.length > 0 && (
                <Card className="border-none shadow-xl shadow-slate-200/50">
                    <CardContent className="p-6 space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
                            Breach Reports ({data.breachReports.length})
                        </h2>
                        <GuaranteeBreachReviewList reports={data.breachReports} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
