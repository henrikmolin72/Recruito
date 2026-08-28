import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isVerifiedAdmin, resolveRouteRole } from "@/lib/auth/resolve-role";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Admin gate trusts app_metadata.role only; a forged user_metadata "admin"
    // resolves to a non-admin route and is redirected away.
    if (!isVerifiedAdmin(user)) {
        redirect(`/${resolveRouteRole(user)}`);
    }

    return <>{children}</>;
}
