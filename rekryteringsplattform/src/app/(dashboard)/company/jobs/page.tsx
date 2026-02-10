import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Briefcase } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function CompanyJobsPage() {
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

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jobb</h1>
          <p className="text-muted-foreground">Hantera dina jobbannonser</p>
        </div>
        <Link href="/company/jobs/new">
          <Button>
            <Plus className="mr-2 size-4" />
            Nytt jobb
          </Button>
        </Link>
      </div>

      {jobs && jobs.length > 0 ? (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Plats</TableHead>
                <TableHead>Rekryterare</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Skapad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <Link
                      href={`/company/jobs/${job.id}`}
                      className="font-medium hover:underline"
                    >
                      {job.title}
                    </Link>
                  </TableCell>
                  <TableCell>{job.location}</TableCell>
                  <TableCell>
                    {job.current_recruiter_count}/{job.max_recruiters}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(job.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={<Briefcase className="size-10" />}
          title="Inga jobb ännu"
          description="Skapa din första jobbannons för att börja ta emot kandidater från rekryterare."
          action={
            <Link href="/company/jobs/new">
              <Button>
                <Plus className="mr-2 size-4" />
                Skapa ditt första jobb
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
