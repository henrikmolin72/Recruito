import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

const MOCK_CANDIDATES = [
  { id: 1, name: "Johan Berg", role: "Frontend Lead", job: "Senior Frontend-utvecklare", company: "TechCorp AB", status: "interview", submitted: "2025-01-20" },
  { id: 2, name: "Marcus Holm", role: "Frontend-utvecklare", job: "Senior Frontend-utvecklare", company: "TechCorp AB", status: "submitted", submitted: "2025-02-01" },
  { id: 3, name: "Sara Nilsson", role: "DevOps Engineer", job: "DevOps Engineer", company: "TechCorp AB", status: "reviewing", submitted: "2025-01-25" },
  { id: 4, name: "Lisa Andersson", role: "Backend-utvecklare", job: "Backend-utvecklare Python", company: "TechCorp AB", status: "hired", submitted: "2024-12-15" },
];

export default function RecruiterCandidatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mina kandidater</h1>
        <p className="text-muted-foreground">Alla kandidater du har presenterat</p>
      </div>

      <div className="grid gap-4">
        {MOCK_CANDIDATES.map((candidate) => (
          <Card key={candidate.id}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar initials={candidate.name.split(" ").map(n => n[0]).join("")} size="lg" />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{candidate.name}</h3>
                    <StatusBadge status={candidate.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{candidate.role}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {candidate.job} — {candidate.company} — Presenterad {candidate.submitted}
                  </p>
                </div>
                <Button variant="outline" size="sm">Detaljer</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
