import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const MOCK_CANDIDATES = [
  { id: 1, name: "Johan Berg", role: "Senior Frontend-utvecklare", job: "Senior Frontend-utvecklare", status: "interview", recruiter: "Erik Lindgren", submitted: "2025-01-20" },
  { id: 2, name: "Sara Nilsson", role: "DevOps Engineer", job: "DevOps Engineer", status: "reviewing", recruiter: "Anna Svensson", submitted: "2025-01-25" },
  { id: 3, name: "Marcus Holm", role: "Frontend-utvecklare", job: "Senior Frontend-utvecklare", status: "submitted", recruiter: "Erik Lindgren", submitted: "2025-02-01" },
  { id: 4, name: "Lisa Andersson", role: "Backend-utvecklare", job: "Backend-utvecklare Python", status: "hired", recruiter: "Karl Pettersson", submitted: "2024-12-15" },
  { id: 5, name: "Peter Eriksson", role: "DevOps Lead", job: "DevOps Engineer", status: "rejected", recruiter: "Anna Svensson", submitted: "2025-01-22" },
];

export default function CompanyCandidatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kandidater</h1>
        <p className="text-muted-foreground">Granska presenterade kandidater</p>
      </div>

      <div className="grid gap-4">
        {MOCK_CANDIDATES.map((candidate) => (
          <Card key={candidate.id}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar initials={candidate.name.split(" ").map(n => n[0]).join("")} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{candidate.name}</h3>
                    <StatusBadge status={candidate.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{candidate.role}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Jobb: {candidate.job}</span>
                    <span>Rekryterare: {candidate.recruiter}</span>
                    <span>Presenterad: {candidate.submitted}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Visa CV</Button>
                  <Button size="sm">Granska</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
