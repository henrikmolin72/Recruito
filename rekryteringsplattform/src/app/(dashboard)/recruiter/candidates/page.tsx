import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { getRecruiterCandidates } from "@/lib/actions/recruiter";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function RecruiterCandidatesPage() {
  const candidates = await getRecruiterCandidates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mina kandidater</h1>
        <p className="text-muted-foreground">Alla kandidater du har presenterat</p>
      </div>

      <div className="grid gap-4">
        {candidates.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
            <p className="text-muted-foreground">Du har inte presenterat några kandidater än.</p>
            <Link href="/recruiter/mandates">
              <Button variant="outline" size="sm" className="mt-4">Gå till mina mandat</Button>
            </Link>
          </div>
        ) : (
          candidates.map((candidate: any) => {
            const company = Array.isArray(candidate.job?.company) ? candidate.job.company[0] : candidate.job?.company;

            return (
              <Card key={candidate.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Avatar initials={(candidate.first_name?.[0] || "") + (candidate.last_name?.[0] || "")} size="lg" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{candidate.first_name} {candidate.last_name}</h3>
                        <StatusBadge status={candidate.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">{candidate.current_title || "Ingen titel"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {candidate.job?.title || "Okänt jobb"} — {company?.company_name || "Okänt företag"} — Presenterad {formatDate(candidate.created_at)}
                      </p>
                    </div>
                    <Link href={`/recruiter/mandates/${candidate.mandate_id}/candidates/${candidate.id}`}>
                      <Button variant="outline" size="sm">Detaljer</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
