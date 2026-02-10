import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "@/components/jobs/job-form";

export default async function NewJobPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!company) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Skapa jobbannons</h1>
        <p className="text-muted-foreground">
          Fyll i uppgifterna nedan för att publicera en ny jobbannons
        </p>
      </div>
      <JobForm companyId={company.id} />
    </div>
  );
}
