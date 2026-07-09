import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDictionary } from "@/i18n/server";
import { guaranteeDisplayStatus } from "@/lib/guarantee";
import { GuaranteeTable, type GuaranteeRow } from "@/components/guarantee/guarantee-table";

async function getCompanyGuarantees(): Promise<GuaranteeRow[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();
    if (!company) return [];

    // Admin client after the auth check above: recruiter display names live in
    // profiles, which company RLS can't read. Scoped strictly to own placements;
    // only the recruiter's name is exposed (already shown as "Presented by X").
    const admin = createAdminClient();
    const { data: placements, error } = await admin
        .from("placements")
        .select(`
            id, total_fee, salary_currency, status, joining_date, guarantee_end_date, recruiter_id,
            candidate:candidates!placements_candidate_id_fkey(first_name, last_name),
            job:jobs(title)
        `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getCompanyGuarantees]", error);
        return [];
    }

    const recruiterIds = [...new Set((placements ?? []).map((p: any) => p.recruiter_id).filter(Boolean))];
    const { data: recruiters } = recruiterIds.length
        ? await admin.from("recruiters").select("id, user_id").in("id", recruiterIds)
        : { data: [] };
    const userIds = (recruiters ?? []).map((r: any) => r.user_id).filter(Boolean);
    const { data: profiles } = userIds.length
        ? await admin.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };
    const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.full_name]));
    const recruiterNameMap = Object.fromEntries((recruiters ?? []).map((r: any) => [r.id, profileMap[r.user_id] ?? "—"]));

    return (placements ?? []).map((p: any) => {
        const candidate = Array.isArray(p.candidate) ? p.candidate[0] : p.candidate;
        const job = Array.isArray(p.job) ? p.job[0] : p.job;
        return {
            id: p.id,
            jobTitle: job?.title ?? "—",
            counterparty: recruiterNameMap[p.recruiter_id] ?? "—",
            candidateName: candidate ? `${candidate.first_name} ${candidate.last_name}` : "—",
            fee: p.total_fee ?? 0,
            currency: p.salary_currency ?? "SEK",
            joiningDate: p.joining_date,
            guaranteeEndDate: p.guarantee_end_date,
            displayStatus: guaranteeDisplayStatus(p),
        };
    });
}

export default async function CompanyGuaranteesPage() {
    const [rows, dict] = await Promise.all([getCompanyGuarantees(), getDictionary()]);
    const c = dict.company;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-brand-500" />
                    {c.guaranteesPageTitle}
                </h1>
                <p className="text-muted-foreground">
                    {c.guaranteesPageSubtitle}{" "}
                    <Link href="/company/billing" className="text-brand-600 hover:underline">
                        {c.guaranteesBillingLink}
                    </Link>
                </p>
            </div>

            <Card>
                <CardContent className="p-6">
                    <GuaranteeTable rows={rows} counterparty="recruiter" />
                </CardContent>
            </Card>
        </div>
    );
}
