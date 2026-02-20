import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { MapPin, Building2, Users, Plus } from "lucide-react";
import { getRecruiterMandates } from "@/lib/actions/recruiter";
import { DownloadJobDescription } from "@/components/dashboard/recruiter/download-job-description";

export default async function RecruiterMandatesPage() {
  const mandates = await getRecruiterMandates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mina mandat</h1>
        <p className="text-muted-foreground">Du har {mandates.length} aktiva mandat</p>
      </div>

      <div className="grid gap-4">
        {mandates.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border border-border border-dashed">
            <h3 className="text-lg font-medium">Inga mandat än</h3>
            <p className="text-muted-foreground mb-4">Hitta intressanta uppdrag att arbeta med.</p>
            <Link href="/recruiter/jobs">
              <Button>Hitta uppdrag</Button>
            </Link>
          </div>
        ) : (
          mandates.map((mandate: any) => (
            <Card key={mandate.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <Link href={`/recruiter/mandates/${mandate.id}`} className="text-lg font-semibold hover:text-brand-600 transition-colors">
                        {mandate.title}
                      </Link>
                      <StatusBadge status={mandate.status} />
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {mandate.company}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {mandate.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DownloadJobDescription mandate={mandate} />
                    <Link href={`/recruiter/mandates/${mandate.id}/candidates/new`}>
                      <Button size="sm" className="gap-1 bg-success-500 hover:bg-success-700">
                        <Plus className="h-4 w-4" /> Presentera kandidat
                      </Button>
                    </Link>
                  </div>
                </div>

                {mandate.candidates.length > 0 ? (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-2">Presenterade kandidater</p>
                    <div className="space-y-2">
                      {mandate.candidates.map((candidate: any) => (
                        <div key={candidate.id} className="flex items-center justify-between p-3 bg-muted rounded-lg group">
                          <div className="flex items-center gap-3">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-sm font-medium">{candidate.name}</span>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={candidate.status} />
                                <Link
                                  href={`/recruiter/mandates/${mandate.id}/candidates/${candidate.id}`}
                                  className="text-[10px] font-bold text-brand-600 hover:text-brand-700 uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-brand-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Öppna chatt
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-border text-center py-6">
                    <p className="text-sm text-muted-foreground">Inga kandidater presenterade ännu</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
