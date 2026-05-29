import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { getRecruiterCandidates } from "@/lib/actions/recruiter";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { candidateInStage } from "@/lib/mandate-stages";
import { Eye, EyeOff } from "lucide-react";

export default async function RecruiterCandidatesPage() {
  const candidates = await getRecruiterCandidates();
  const dict = await getDictionary();
  const r = dict.recruiter;

  // Lightweight pipeline summary, derived from the candidates already loaded.
  const inInterview = candidates.filter((c: any) => candidateInStage(c, "interview")).length;
  const hired = candidates.filter((c: any) => candidateInStage(c, "hired")).length;
  const active = candidates.filter((c: any) =>
    candidateInStage(c, "in_review") ||
    candidateInStage(c, "submitted") ||
    candidateInStage(c, "interview") ||
    candidateInStage(c, "offer")
  ).length;

  const stats = [
    { label: r.statActive || "Active", value: active },
    { label: r.colInInterview || "In Interview", value: inInterview },
    { label: r.colHired || "Hired", value: hired },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{r.pipelineTitle || "Candidate Pipeline"}</h1>
        <p className="text-muted-foreground">{r.candidatesPageSubtitle}</p>
      </div>

      {candidates.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4">
        {candidates.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
            <p className="text-muted-foreground">{r.noCandidatesPresentedProfile}</p>
            <Link href="/recruiter/mandates">
              <Button variant="outline" size="sm" className="mt-4">{r.goToMandates}</Button>
            </Link>
          </div>
        ) : (
          candidates.map((candidate: any) => {
            const company = Array.isArray(candidate.job?.company) ? candidate.job.company[0] : candidate.job?.company;
            // "Last updated" reflects the most recent status change (or row update).
            const lastUpdated = candidate.status_changed_at || candidate.updated_at || candidate.created_at;
            const seen = !!candidate.company_viewed_at;

            return (
              <Card key={candidate.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Avatar initials={(candidate.first_name?.[0] || "") + (candidate.last_name?.[0] || "")} size="lg" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold">{candidate.first_name} {candidate.last_name}</h3>
                        <StatusBadge status={candidate.status} />
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${seen ? "text-emerald-600" : "text-muted-foreground"}`}>
                          {seen ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          {seen ? (r.seenLabel || "Seen") : (r.notSeenLabel || "Not seen")}
                        </span>
                      </div>
                      {candidate.current_title && (
                        <p className="text-sm text-muted-foreground">{candidate.current_title}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {candidate.job?.title || dict.common.unknownJob} — {company?.company_name || dict.common.unknownCompany} — {r.presentedDate.replace("{date}", formatDate(candidate.created_at))}
                      </p>
                      {lastUpdated && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(r.lastUpdatedLabel || "Last updated")}: {formatDate(lastUpdated)}
                        </p>
                      )}
                    </div>
                    <Link href={`/recruiter/mandates/${candidate.mandate_id}/candidates/${candidate.id}`}>
                      <Button variant="outline" size="sm">{dict.common.details}</Button>
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
