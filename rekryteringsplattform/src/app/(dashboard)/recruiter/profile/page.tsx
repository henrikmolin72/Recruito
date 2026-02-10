import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecruiterProfileForm } from "@/components/auth/recruiter-profile-form";

export default async function RecruiterProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();
  const { data: recruiter } = await supabase
    .from("recruiters").select("*").eq("user_id", user.id).single();
  if (!profile || !recruiter) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Min profil</h1>
        <p className="text-muted-foreground">Uppdatera din rekryterarprofil</p>
      </div>
      <RecruiterProfileForm profile={profile} recruiter={recruiter} />
    </div>
  );
}
