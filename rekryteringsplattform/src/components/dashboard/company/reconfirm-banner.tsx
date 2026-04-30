import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/server";

export async function ReconfirmBanner() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();
    if (!company) return null;

    const { data: jobs } = await supabase
        .from("jobs")
        .select("id")
        .eq("company_id", company.id)
        .eq("status", "pending_client_reconfirm")
        .limit(20);

    const count = jobs?.length ?? 0;
    if (count === 0) return null;

    const dict = await getDictionary();
    const tmpl = count === 1
        ? (dict as any)?.feeReconfirm?.bannerSingular ?? "{count} job needs your re-confirmation"
        : (dict as any)?.feeReconfirm?.bannerPlural ?? "{count} jobs need your re-confirmation";
    const text = tmpl.replace("{count}", String(count));

    return (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-sm">
            <Link href={`/company/jobs/${jobs![0].id}`} className="font-semibold text-amber-900 hover:underline">
                {text} →
            </Link>
        </div>
    );
}
