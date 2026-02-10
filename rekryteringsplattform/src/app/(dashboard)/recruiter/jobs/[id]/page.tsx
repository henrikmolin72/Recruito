import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Building2, MapPin, Users, Briefcase } from "lucide-react";
import { TakeMandateButton } from "@/components/jobs/take-mandate-button";
import { CandidateSubmitForm } from "@/components/candidates/candidate-form";

export default async function RecruiterJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recruiter } = await supabase
    .from("recruiters")
    .select("id, approval_status")
    .eq("user_id", user.id)
    .single();
  if (!recruiter || recruiter.approval_status !== "approved") redirect("/recruiter");

  const { data: job } = await supabase
    .from("jobs")
    .select("*, companies(company_name, city, industry, logo_url)")
    .eq("id", id)
    .eq("status", "active")
    .single();
  if (!job) notFound();

  const company = job.companies as any;

  // Check if recruiter has mandate
  const { data: mandate } = await supabase
    .from("job_mandates")
    .select("id")
    .eq("job_id", job.id)
    .eq("recruiter_id", recruiter.id)
    .eq("is_active", true)
    .maybeSingle();

  const hasMandate = !!mandate;

  // Count active mandates for this recruiter
  const { count: activeMandateCount } = await supabase
    .from("job_mandates")
    .select("*", { count: "exact", head: true })
    .eq("recruiter_id", recruiter.id)
    .eq("is_active", true);

  // Get candidates if recruiter has mandate
  let candidates: any[] = [];
  if (hasMandate && mandate) {
    const { data } = await supabase
      .from("candidates")
      .select("*")
      .eq("job_id", job.id)
      .eq("recruiter_id", recruiter.id)
      .order("submitted_at", { ascending: false });
    candidates = data ?? [];
  }

  const isFull = job.current_recruiter_count >= job.max_recruiters;
  const avgSalary = job.salary_min && job.salary_max
    ? Math.round((job.salary_min + job.salary_max) / 2) : 0;
  const totalFee = avgSalary ? Math.round(avgSalary * (job.fee_percentage / 100)) : 0;
  const recruiterFee = Math.round(totalFee * 0.75);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="size-4" />
          {company?.company_name}
          {company?.city && <><span>·</span><MapPin className="size-3.5" />{company.city}</>}
        </div>
        <h1 className="mt-1 text-2xl font-bold">{job.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">{job.industry}</Badge>
          <Badge variant="secondary">{job.location}</Badge>
          <Badge variant="secondary">{job.employment_type}</Badge>
          {job.remote_policy && <Badge variant="secondary">{job.remote_policy}</Badge>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Lönespann</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {job.salary_min && job.salary_max
                ? `${formatCurrency(job.salary_min)} - ${formatCurrency(job.salary_max)}`
                : "Ej angivet"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-success-50 border-success-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-success-700">Din ersättning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-success-700">
              {recruiterFee > 0 ? `~${formatCurrency(recruiterFee)}` : "-"}
            </p>
            <p className="text-xs text-success-700">{job.fee_percentage}% avgift · 75% till dig</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Rekryterare</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {job.current_recruiter_count}/{job.max_recruiters}
            </p>
            <p className="text-xs text-muted-foreground">
              {isFull ? "Alla platser tagna" : `${job.max_recruiters - job.current_recruiter_count} platser kvar`}
            </p>
          </CardContent>
        </Card>
      </div>

      {!hasMandate && (
        <TakeMandateButton
          jobId={job.id}
          recruiterId={recruiter.id}
          isFull={isFull}
          activeMandates={activeMandateCount ?? 0}
        />
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Beskrivning</CardTitle></CardHeader>
        <CardContent><div className="whitespace-pre-wrap text-sm">{job.description}</div></CardContent>
      </Card>
      {job.requirements && (
        <Card>
          <CardHeader><CardTitle className="text-base">Krav</CardTitle></CardHeader>
          <CardContent><div className="whitespace-pre-wrap text-sm">{job.requirements}</div></CardContent>
        </Card>
      )}
      {job.nice_to_have && (
        <Card>
          <CardHeader><CardTitle className="text-base">Meriterande</CardTitle></CardHeader>
          <CardContent><div className="whitespace-pre-wrap text-sm">{job.nice_to_have}</div></CardContent>
        </Card>
      )}

      {hasMandate && mandate && (
        <>
          <div className="border-t pt-6">
            <h2 className="text-xl font-bold">Presentera kandidat</h2>
            <p className="text-muted-foreground">Fyll i kandidatens uppgifter nedan</p>
          </div>
          <CandidateSubmitForm
            jobId={job.id}
            recruiterId={recruiter.id}
            mandateId={mandate.id}
          />

          {candidates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dina kandidater ({candidates.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {candidates.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium">{c.first_name} {c.last_name}</p>
                        <p className="text-sm text-muted-foreground">{c.current_title}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
