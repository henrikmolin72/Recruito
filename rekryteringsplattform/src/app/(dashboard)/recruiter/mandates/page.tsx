import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { MapPin, Building2, Users, Plus } from "lucide-react";

const MOCK_MANDATES = [
  { id: 1, title: "Senior Frontend-utvecklare", company: "TechCorp AB", location: "Stockholm", status: "active", candidates: [
    { name: "Johan Berg", status: "interview" },
    { name: "Marcus Holm", status: "submitted" },
  ]},
  { id: 2, title: "DevOps Engineer", company: "TechCorp AB", location: "Remote (Sverige)", status: "active", candidates: [
    { name: "Sara Nilsson", status: "reviewing" },
  ]},
  { id: 3, title: "Data Analyst", company: "FinanceHQ", location: "Göteborg", status: "active", candidates: [] },
];

export default function RecruiterMandatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mina mandat</h1>
        <p className="text-muted-foreground">Du har {MOCK_MANDATES.length} av 5 möjliga aktiva mandat</p>
      </div>

      <div className="grid gap-4">
        {MOCK_MANDATES.map((mandate) => (
          <Card key={mandate.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{mandate.title}</h3>
                    <StatusBadge status={mandate.status} />
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {mandate.company}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {mandate.location}</span>
                  </div>
                </div>
                <Button size="sm" className="gap-1 bg-success-500 hover:bg-success-700">
                  <Plus className="h-4 w-4" /> Presentera kandidat
                </Button>
              </div>

              {mandate.candidates.length > 0 ? (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm font-medium mb-2">Presenterade kandidater</p>
                  <div className="space-y-2">
                    {mandate.candidates.map((candidate, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{candidate.name}</span>
                        </div>
                        <StatusBadge status={candidate.status} />
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
        ))}
      </div>
    </div>
  );
}
