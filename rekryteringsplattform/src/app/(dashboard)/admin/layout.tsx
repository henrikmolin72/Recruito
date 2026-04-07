import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const role = user.app_metadata?.role || user.user_metadata?.role;
    if (role !== "admin") {
        redirect(`/${role || "company"}`);
    }

    return <>{children}</>;
}
