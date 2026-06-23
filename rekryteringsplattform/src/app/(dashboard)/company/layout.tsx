import { ReconfirmBanner } from "@/components/dashboard/company/reconfirm-banner";
import { createClient } from "@/lib/supabase/server";
import { createTranslator } from "@/i18n/server";

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let approved = true;
    if (user) {
        const { data: company } = await supabase
            .from("companies")
            .select("approval_status")
            .eq("user_id", user.id)
            .maybeSingle();
        // Missing row → don't lock out (edge cases / admin impersonation).
        approved = !company || company.approval_status === "approved";
    }

    if (!approved) {
        const t = await createTranslator();
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-8">
                <div className="max-w-md text-center space-y-3">
                    <h1 className="text-2xl font-bold">{t("company.pendingApprovalTitle")}</h1>
                    <p className="text-muted-foreground">
                        {t("company.pendingApprovalBody")}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <ReconfirmBanner />
            {children}
        </>
    );
}
