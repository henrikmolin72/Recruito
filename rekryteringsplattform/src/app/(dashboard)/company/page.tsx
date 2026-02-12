import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Briefcase, Users, Clock, CheckCircle } from "lucide-react";

const MOCK_JOBS = [
  { id: 1, title: "Senior Frontend-utvecklare", location: "Stockholm", status: "active", candidates: 4, recruiters: 3 },
  { id: 2, title: "DevOps Engineer", location: "Remote (Sverige)", status: "active", candidates: 2, recruiters: 2 },
  { id: 3, title: "Product Manager", location: "Göteborg", status: "draft", candidates: 0, recruiters: 0 },
  { id: 4, title: "Backend-utvecklare Python", location: "Malmö", status: "filled", candidates: 6, recruiters: 4 },
];

export default function CompanyDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Välkommen tillbaka, TechCorp AB</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Aktiva jobb" value={3} icon={Briefcase} trend={{ value: 12, positive: true }} />
        <StatsCard title="Presenterade kandidater" value={12} icon={Users} trend={{ value: 8, positive: true }} />
        <StatsCard title="Pågående intervjuer" value={4} icon={Clock} />
        <StatsCard title="Lyckade placeringar" value={1} icon={CheckCircle} description="Senaste 90 dagarna" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dina jobb</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Titel</th>
                  <th className="pb-3 font-medium text-muted-foreground">Plats</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 font-medium text-muted-foreground">Rekryterare</th>
                  <th className="pb-3 font-medium text-muted-foreground">Kandidater</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_JOBS.map((job) => (
                  <tr key={job.id} className="border-b border-border last:border-0">
                    <td className="py-3 font-medium">{job.title}</td>
                    <td className="py-3 text-muted-foreground">{job.location}</td>
                    <td className="py-3"><StatusBadge status={job.status} /></td>
                    <td className="py-3"><Badge variant="outline">{job.recruiters}/5</Badge></td>
                    <td className="py-3">{job.candidates}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Senaste aktiviteten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { text: "Erik Lindgren presenterade en kandidat för Senior Frontend-utvecklare", time: "2 timmar sedan" },
              { text: "Anna Svensson tog mandatet för DevOps Engineer", time: "5 timmar sedan" },
              { text: "Kandidat Johan Berg gick vidare till intervju", time: "1 dag sedan" },
              { text: "Backend-utvecklare Python markerades som tillsatt", time: "3 dagar sedan" },
            ].map((activity, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                <div className="h-2 w-2 rounded-full bg-brand-500 mt-2 shrink-0" />
                <div>
                  <p className="text-sm">{activity.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
