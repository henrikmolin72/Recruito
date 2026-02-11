import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getLocale } from "@/lib/i18n/locale";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  let companyName: string | undefined;
  if (profile.role === "company") {
    const { data: company } = await supabase
      .from("companies")
      .select("company_name")
      .eq("user_id", profile.id)
      .single();
    companyName = company?.company_name;
  }

  const role = profile.role as "company" | "recruiter" | "admin";
  const locale = await getLocale();

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="hidden lg:block">
        <Sidebar
          role={role}
          userName={profile.full_name}
          companyName={companyName}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          role={role}
          userName={profile.full_name}
          companyName={companyName}
          locale={locale}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
