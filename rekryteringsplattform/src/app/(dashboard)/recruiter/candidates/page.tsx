import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function RecruiterCandidatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recruiter } = await supabase
    .from("recruiters").select("id").eq("user_id", user.id).single();
  if (!recruiter) redirect("/login");

  const { data: candidates } = await supabase
    .from("candidates")
    .select("*, jobs(title, companies(company_name))")
    .eq("recruiter_id", recruiter.id)
    .order("submitted_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mina kandidater</h1>
        <p className="text-muted-foreground">Alla kandidater du har presenterat</p>
      </div>
      {candidates && candidates.length > 0 ? (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kandidat</TableHead>
                <TableHead>Jobb</TableHead>
                <TableHead>Företag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Datum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((c) => {
                const job = c.jobs as any;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.first_name} {c.last_name}</TableCell>
                    <TableCell>{job?.title}</TableCell>
                    <TableCell>{job?.companies?.company_name}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.submitted_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={<Users className="size-10" />}
          title="Inga kandidater ännu"
          description="Presentera din första kandidat genom att ta mandat för ett jobb." />
      )}
    </div>
  );
}
