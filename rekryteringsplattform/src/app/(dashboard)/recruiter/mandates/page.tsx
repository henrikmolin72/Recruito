import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ReleaseMandateButton } from "@/components/jobs/release-mandate-button";

export default async function RecruiterMandatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recruiter } = await supabase
    .from("recruiters")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!recruiter) redirect("/login");

  const { data: mandates } = await supabase
    .from("job_mandates")
    .select("*, jobs(title, location, industry, status, company_id, companies(company_name)), candidates:candidates(count)")
    .eq("recruiter_id", recruiter.id)
    .eq("is_active", true)
    .order("claimed_at", { ascending: false });

  const { count: totalActive } = await supabase
    .from("job_mandates")
    .select("*", { count: "exact", head: true })
    .eq("recruiter_id", recruiter.id)
    .eq("is_active", true);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mina mandat</h1>
          <p className="text-muted-foreground">
            {totalActive ?? 0}/5 mandatplatser använda
          </p>
        </div>
        <Link href="/recruiter/jobs">
          <Button className="bg-success-500 hover:bg-success-700">Hitta fler jobb</Button>
        </Link>
      </div>

      {mandates && mandates.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {mandates.map((m) => {
            const job = m.jobs as any;
            const candidateCount = (m as any).candidates?.[0]?.count ?? 0;
            return (
              <Card key={m.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{job?.companies?.company_name}</div>
                    <StatusBadge status={job?.status ?? "active"} />
                  </div>
                  <CardTitle className="text-base">{job?.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <span>{job?.location}</span><span>·</span><span>{job?.industry}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      <Users className="mr-1 size-3" />{candidateCount} kandidater
                    </Badge>
                    <span className="text-xs text-muted-foreground">Mandat sedan {formatDate(m.claimed_at)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/recruiter/jobs/${m.job_id}`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">Presentera kandidat</Button>
                    </Link>
                    <ReleaseMandateButton mandateId={m.id} jobTitle={job?.title ?? "jobbet"} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Briefcase className="size-10" />}
          title="Inga aktiva mandat"
          description="Ta mandat för jobb för att börja presentera kandidater."
          action={<Link href="/recruiter/jobs"><Button className="bg-success-500 hover:bg-success-700">Hitta jobb</Button></Link>}
        />
      )}
    </div>
  );
}
