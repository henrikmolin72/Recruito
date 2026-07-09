import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDictionary } from "@/i18n/server";
import { guaranteeDisplayStatus } from "@/lib/guarantee";
import { GuaranteeTable, type GuaranteeRow } from "@/components/guarantee/guarantee-table";

async function getRecruiterGuarantees(): Promise<GuaranteeRow[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id")
        .eq("user_id", user.id)
        .single();
    if (!recruiter) return [];

    // Admin client after the auth check above: the embedded companies join is
    // otherwise silently emptied by RLS. Scoped strictly to own placements.
    const admin = createAdminClient();
    const { data: placements, error } = await admin
        .from("placements")
        .select(`
            id, recruiter_fee, salary_currency, status, joining_date, guarantee_end_date,
            candidate:candidates!placements_candidate_id_fkey(first_name, last_name),
            job:jobs(title),
            company:companies(company_name)
        `)
        .eq("recruiter_id", recruiter.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getRecruiterGuarantees]", error);
        return [];
    }

    return (placements ?? []).map((p: any) => {
        const candidate = Array.isArray(p.candidate) ? p.candidate[0] : p.candidate;
        const job = Array.isArray(p.job) ? p.job[0] : p.job;
        const company = Array.isArray(p.company) ? p.company[0] : p.company;
        return {
            id: p.id,
            jobTitle: job?.title ?? "—",
            counterparty: company?.company_name ?? "—",
            candidateName: candidate ? `${candidate.first_name} ${candidate.last_name}` : "—",
            fee: p.recruiter_fee ?? 0,
            currency: p.salary_currency ?? "SEK",
            joiningDate: p.joining_date,
            guaranteeEndDate: p.guarantee_end_date,
            displayStatus: guaranteeDisplayStatus(p),
        };
    });
}

export default async function RecruiterGuaranteesPage() {
    const [rows, dict] = await Promise.all([getRecruiterGuarantees(), getDictionary()]);
    const r = dict.recruiter;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-brand-500" />
                    {r.guaranteesPageTitle}
                </h1>
                <p className="text-muted-foreground">{r.guaranteesPageSubtitle}</p>
            </div>

            <Card>
                <CardContent className="p-6">
                    <GuaranteeTable rows={rows} counterparty="company" />
                </CardContent>
            </Card>
        </div>
    );
}
