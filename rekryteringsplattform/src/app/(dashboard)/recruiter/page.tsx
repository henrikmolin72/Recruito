import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatsCard } from "@/components/dashboard/stats-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, CalendarCheck, DollarSign, Search, AlertCircle, Clock, XCircle } from "lucide-react";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";

export default async function RecruiterDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: recruiter } = await supabase
    .from("recruiters")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!recruiter) redirect("/login");

  // Show pending/rejected/suspended status
  if (recruiter.approval_status !== "approved") {
    const messages: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
      pending: {
        title: "Din profil väntar på godkännande",
        description: "Vi granskar vanligtvis inom 24 timmar. Du får ett meddelande när din profil har godkänts.",
        icon: <Clock className="size-12 text-warning-500" />,
      },
      rejected: {
        title: "Din ansökan avslogs",
        description: "Kontakta oss på support@rekryto.se om du har frågor.",
        icon: <XCircle className="size-12 text-danger-500" />,
      },
      suspended: {
        title: "Ditt konto har pausats",
        description: "Kontakta support för mer information.",
        icon: <AlertCircle className="size-12 text-danger-500" />,
      },
    };
    const msg = messages[recruiter.approval_status] ?? messages.pending;
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="pt-8">
            <div className="mb-4 flex justify-center">{msg.icon}</div>
            <h1 className="text-xl font-bold">{msg.title}</h1>
            <p className="mt-2 text-muted-foreground">{msg.description}</p>
            <StatusBadge status={recruiter.approval_status} className="mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Stats
  const { count: activeMandates } = await supabase
    .from("job_mandates")
    .select("*", { count: "exact", head: true })
    .eq("recruiter_id", recruiter.id)
    .eq("is_active", true);

  const { count: candidatesThisMonth } = await supabase
    .from("candidates")
    .select("*", { count: "exact", head: true })
    .eq("recruiter_id", recruiter.id)
    .gte("submitted_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  const { count: interviewCount } = await supabase
    .from("candidates")
    .select("*", { count: "exact", head: true })
    .eq("recruiter_id", recruiter.id)
    .eq("status", "interview");

  const { data: completedPlacements } = await supabase
    .from("placements")
    .select("recruiter_fee")
    .eq("recruiter_id", recruiter.id)
    .eq("status", "payout_released");

  const totalEarnings = completedPlacements?.reduce((s, p) => s + p.recruiter_fee, 0) ?? 0;

  // Active mandates with job info
  const { data: mandates } = await supabase
    .from("job_mandates")
    .select("*, jobs(title, location, industry, company_id, companies(company_name))")
    .eq("recruiter_id", recruiter.id)
    .eq("is_active", true)
    .order("claimed_at", { ascending: false });

  // Recent candidate updates
  const { data: recentCandidates } = await supabase
    .from("candidates")
    .select("*, jobs(title)")
    .eq("recruiter_id", recruiter.id)
    .order("updated_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Välkommen, {profile?.full_name}</h1>
          <p className="text-muted-foreground">Här är din rekryteringsöversikt</p>
        </div>
        <Link href="/recruiter/jobs">
          <Button className="bg-success-500 hover:bg-success-700">
            <Search className="mr-2 size-4" />
            Hitta jobb
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Aktiva mandat"
          value={`${activeMandates ?? 0}/5`}
          icon={<Briefcase className="size-4" />}
        />
        <StatsCard
          title="Kandidater denna månad"
          value={candidatesThisMonth ?? 0}
          icon={<Users className="size-4" />}
        />
        <StatsCard
          title="I intervju"
          value={interviewCount ?? 0}
          icon={<CalendarCheck className="size-4" />}
        />
        <StatsCard
          title="Total intjänad"
          value={formatCurrency(totalEarnings)}
          icon={<DollarSign className="size-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Aktiva mandat</CardTitle>
            <Link href="/recruiter/mandates">
              <Button variant="ghost" size="sm">Visa alla</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {mandates && mandates.length > 0 ? (
              <div className="space-y-3">
                {mandates.map((m) => {
                  const job = m.jobs as any;
                  return (
                    <Link key={m.id} href={`/recruiter/jobs/${m.job_id}`}
                      className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted">
                      <div>
                        <p className="font-medium">{job?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {job?.companies?.company_name} · {job?.location}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeDate(m.claimed_at)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<Briefcase className="size-8" />}
                title="Inga aktiva mandat"
                description="Bläddra bland jobb och ta ditt första mandat."
                action={<Link href="/recruiter/jobs"><Button size="sm" className="bg-success-500 hover:bg-success-700">Hitta jobb</Button></Link>}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Senaste uppdateringar</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCandidates && recentCandidates.length > 0 ? (
              <div className="space-y-3">
                {recentCandidates.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="font-medium">{c.first_name} {c.last_name}</p>
                      <p className="text-sm text-muted-foreground">{(c.jobs as any)?.title}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Users className="size-8" />}
                title="Inga kandidater ännu"
                description="Presentera kandidater för att se uppdateringar här."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
