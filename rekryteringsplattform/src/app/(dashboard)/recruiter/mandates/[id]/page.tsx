import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Briefcase, MapPin, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DownloadJobDescription } from "@/components/dashboard/recruiter/download-job-description";
import { getRecruiterMandateById } from "@/lib/actions/recruiter";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getDictionary } from "@/i18n/server";

export default async function RecruiterMandateDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mandate = await getRecruiterMandateById(id);

  if (!mandate) {
    notFound();
  }

  const dict = await getDictionary();
  const r = dict.recruiter;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href="/recruiter/mandates" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {r.backToMandates}
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{mandate.title}</h1>
            <StatusBadge status={mandate.status} />
          </div>
          <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {mandate.company}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {mandate.location || dict.common.notSpecified}</span>
            <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {mandate.employment_type || dict.common.notSpecified}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DownloadJobDescription mandate={mandate} />
          <Link href={`/recruiter/mandates/${mandate.id}/candidates/new`}>
            <Button size="sm" className="bg-success-500 hover:bg-success-700 gap-1">
              <Plus className="h-4 w-4" /> {r.presentCandidate}
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{r.industryLabel}</p>
            <p className="mt-1 text-sm">{mandate.industry || dict.common.notSpecified}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{r.feeLabel}</p>
            <p className="mt-1 text-sm">{mandate.fee_percentage ? `${mandate.fee_percentage}%` : dict.common.notSpecifiedNeutral}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{r.salaryRange}</p>
            <p className="mt-1 text-sm">
              {mandate.salary_min
                ? `${formatCurrency(mandate.salary_min)}${mandate.salary_max ? ` - ${formatCurrency(mandate.salary_max)}` : ""}`
                : dict.common.notSpecifiedNeutral}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{r.roleDescription}</p>
          <p className="text-sm whitespace-pre-wrap">{mandate.description || r.noDescriptionAvailable}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold inline-flex items-center gap-2"><Users className="h-4 w-4" /> {r.candidatesHeader.replace("{count}", String(mandate.candidates.length))}</h2>
          </div>

          {mandate.candidates.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{r.noCandidatesPresentedTable}</div>
          ) : (
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="p-4 font-medium text-muted-foreground">{r.tableNameHeader}</th>
                  <th className="p-4 font-medium text-muted-foreground">{r.tableStatusHeader}</th>
                  <th className="p-4 font-medium text-muted-foreground">{r.tableSentHeader}</th>
                  <th className="p-4 font-medium text-muted-foreground">{r.tableActionHeader}</th>
                </tr>
              </thead>
              <tbody>
                {mandate.candidates.map((candidate) => (
                  <tr key={candidate.id} className="border-b border-border last:border-0">
                    <td className="p-4 font-medium">{candidate.name}</td>
                    <td className="p-4"><StatusBadge status={candidate.status} /></td>
                    <td className="p-4 text-muted-foreground">{formatDate(candidate.created_at)}</td>
                    <td className="p-4">
                      <Link href={`/recruiter/mandates/${mandate.id}/candidates/${candidate.id}`} className="text-brand-600 hover:text-brand-700 font-medium">
                        {r.openCandidate}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
