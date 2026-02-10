import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "@/components/jobs/job-form";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("company_id", company.id)
    .single();

  if (!job) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Redigera jobb</h1>
        <p className="text-muted-foreground">{job.title}</p>
      </div>
      <JobForm companyId={company.id} initialData={job} />
    </div>
  );
}
