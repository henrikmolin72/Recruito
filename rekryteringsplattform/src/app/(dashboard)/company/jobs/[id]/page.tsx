import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Edit, Users, Eye } from "lucide-react";

export default async function JobDetailPage({
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

  const { data: candidates } = await supabase
    .from("candidates")
    .select("*")
    .eq("job_id", job.id)
    .order("submitted_at", { ascending: false });

  const { data: mandates } = await supabase
    .from("job_mandates")
    .select("*, recruiters(headline, rating, total_placements, user_id)")
    .eq("job_id", job.id)
    .eq("is_active", true);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-muted-foreground">
            {job.location} · {job.industry} · {job.employment_type}
          </p>
        </div>
        <Link href={`/company/jobs/${job.id}/edit`}>
          <Button variant="outline">
            <Edit className="mr-2 size-4" />
            Redigera
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="candidates">
            Kandidater ({candidates?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="recruiters">
            Rekryterare ({mandates?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Avgift</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{job.fee_percentage}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Publicerad</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">
                  {job.published_at ? formatDate(job.published_at) : "Ej publicerad"}
                </p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Beskrivning</CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none text-sm">
              <div className="whitespace-pre-wrap">{job.description}</div>
            </CardContent>
          </Card>
          {job.requirements && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Krav</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="whitespace-pre-wrap">{job.requirements}</div>
              </CardContent>
            </Card>
          )}
          {job.nice_to_have && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meriterande</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="whitespace-pre-wrap">{job.nice_to_have}</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="candidates" className="mt-4">
          {candidates && candidates.length > 0 ? (
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead>Nuvarande titel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Inskickad</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.first_name} {c.last_name}
                      </TableCell>
                      <TableCell>{c.current_title ?? "-"}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(c.submitted_at)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/company/candidates/${c.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-1 size-4" />
                            Visa
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={<Users className="size-10" />}
              title="Inga kandidater ännu"
              description="Kandidater visas här när rekryterare presenterar dem."
            />
          )}
        </TabsContent>

        <TabsContent value="recruiters" className="mt-4">
          {mandates && mandates.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {mandates.map((mandate) => {
                const recruiter = mandate.recruiters as any;
                return (
                  <Card key={mandate.id}>
                    <CardContent className="pt-6">
                      <p className="font-medium">{recruiter?.headline ?? "Rekryterare"}</p>
                      <div className="mt-2 flex gap-2">
                        <Badge variant="secondary">
                          {recruiter?.total_placements ?? 0} placeringar
                        </Badge>
                        {recruiter?.rating > 0 && (
                          <Badge variant="secondary">
                            {recruiter.rating} betyg
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Mandat sedan {formatDate(mandate.claimed_at)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Users className="size-10" />}
              title="Inga rekryterare ännu"
              description="Rekryterare som tar mandat för detta jobb visas här."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
