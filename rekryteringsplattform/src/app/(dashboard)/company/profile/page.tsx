import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyProfileForm } from "@/components/auth/company-profile-form";

export default async function CompanyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile || !company) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Företagsprofil</h1>
        <p className="text-muted-foreground">
          Uppdatera företagets information
        </p>
      </div>
      <CompanyProfileForm profile={profile} company={company} />
    </div>
  );
}
