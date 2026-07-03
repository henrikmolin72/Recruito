import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { TalentPoolList } from "@/components/talent-pool/talent-pool-list";
import { getDictionary } from "@/i18n/server";
import { getClientMatchLevel } from "@/lib/screening/match-level";

async function getTalentPool() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data: company } = await admin
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!company) return null;

    const { data: entries } = await admin
        .from("talent_pool_entries")
        .select(`
            id,
            notes,
            tags,
            created_at,
            candidate:candidates(
                id, first_name, last_name, current_title, current_company,
                years_experience, status, ai_match_score, created_at,
                job:jobs(id, title)
            ),
            application:applications(
                id, full_name, created_at, status,
                screening:ai_screenings(match_score)
            )
        `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

    // Supabase returns nested relations as arrays; normalise recursively
    return (entries ?? []).map((e: any) => ({
        ...e,
        candidate: Array.isArray(e.candidate)
            ? e.candidate[0]
                ? { ...e.candidate[0], job: Array.isArray(e.candidate[0].job) ? e.candidate[0].job[0] ?? null : e.candidate[0].job }
                : null
            : e.candidate,
        application: Array.isArray(e.application)
            ? e.application[0]
                ? { ...e.application[0], screening: Array.isArray(e.application[0].screening) ? e.application[0].screening[0] ?? null : e.application[0].screening }
                : null
            : e.application,
    }));
}

export default async function TalentPoolPage() {
    const entries = await getTalentPool();
    if (!entries) notFound();

    // Client (company) sees a tier LABEL, never a raw AI % (client request
    // 2026-07-02) — same policy as the candidate detail page. Compute the label
    // server-side from whichever score applies (candidate eval score or the
    // application quick-screen score), then strip BOTH raw numbers so they never
    // cross to the client list. getClientMatchLevel returns null below 75, so
    // Not-Recommended / unscored candidates carry no badge.
    const dict = await getDictionary();
    const clientEntries = entries.map((e: any) => {
        const rawScore = e.candidate
            ? e.candidate.ai_match_score
            : e.application?.screening?.match_score ?? null;
        const level = getClientMatchLevel(rawScore);
        const matchLabel = level
            ? (dict.components as Record<string, string>)[level.labelKey.split(".").pop()!]
            : null;
        return {
            ...e,
            matchLabel,
            candidate: e.candidate ? { ...e.candidate, ai_match_score: null } : e.candidate,
            application: e.application?.screening
                ? { ...e.application, screening: { ...e.application.screening, match_score: null } }
                : e.application,
        };
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="h-6 w-6 text-brand-600" />
                        Talent Pool
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Candidates saved across all your job openings — {entries.length} saved
                    </p>
                </div>
            </div>

            <TalentPoolList initialEntries={clientEntries} />
        </div>
    );
}
