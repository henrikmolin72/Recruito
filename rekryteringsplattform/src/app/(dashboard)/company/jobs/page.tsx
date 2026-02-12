import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Plus, MapPin, Users, Clock } from "lucide-react";

const MOCK_JOBS = [
  {
    id: 1, title: "Senior Frontend-utvecklare", location: "Stockholm", industry: "IT & Tech",
    status: "active", salary: "720 000 SEK", recruiters: 3, candidates: 4, created: "2025-01-15",
    description: "Vi söker en erfaren frontend-utvecklare med React/Next.js-kompetens.",
  },
  {
    id: 2, title: "DevOps Engineer", location: "Remote (Sverige)", industry: "IT & Tech",
    status: "active", salary: "660 000 SEK", recruiters: 2, candidates: 2, created: "2025-01-20",
    description: "Driven DevOps-ingenjör som kan automatisera och förbättra vår CI/CD-pipeline.",
  },
  {
    id: 3, title: "Product Manager", location: "Göteborg", industry: "IT & Tech",
    status: "draft", salary: "780 000 SEK", recruiters: 0, candidates: 0, created: "2025-02-01",
    description: "Produktägare för vår SaaS-plattform med erfarenhet av agilt arbete.",
  },
  {
    id: 4, title: "Backend-utvecklare Python", location: "Malmö", industry: "IT & Tech",
    status: "filled", salary: "690 000 SEK", recruiters: 4, candidates: 6, created: "2024-12-01",
    description: "Senior backend-utvecklare med Python/Django-erfarenhet.",
  },
];

export default function CompanyJobsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jobb</h1>
          <p className="text-muted-foreground">Hantera dina jobbannonser</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Skapa jobb
        </Button>
      </div>

      <div className="grid gap-4">
        {MOCK_JOBS.map((job) => (
          <Card key={job.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{job.title}</h3>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
                    <span>{job.salary}</span>
                    <span>{job.industry}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{job.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-1.5 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{job.recruiters}/5 rekryterare</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span>{job.candidates} kandidater</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Skapad {job.created}</span>
                </div>
                <div className="ml-auto">
                  <Button variant="outline" size="sm">Visa detaljer</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
