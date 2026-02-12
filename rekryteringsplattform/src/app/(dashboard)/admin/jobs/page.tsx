import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const MOCK_JOBS = [
  { id: 1, title: "Senior Frontend-utvecklare", company: "TechCorp AB", location: "Stockholm", salary: 720000, status: "active", recruiters: 3, candidates: 4 },
  { id: 2, title: "DevOps Engineer", company: "TechCorp AB", location: "Remote", salary: 660000, status: "active", recruiters: 2, candidates: 2 },
  { id: 3, title: "Ekonomichef", company: "FinanceHQ", location: "Göteborg", salary: 840000, status: "filled", recruiters: 4, candidates: 5 },
  { id: 4, title: "UX Designer Senior", company: "DesignHub AB", location: "Stockholm", salary: 600000, status: "active", recruiters: 2, candidates: 1 },
  { id: 5, title: "Sales Director Nordic", company: "SalesForce Nordic", location: "Remote", salary: 960000, status: "active", recruiters: 3, candidates: 3 },
  { id: 6, title: "Product Manager", company: "TechCorp AB", location: "Göteborg", salary: 780000, status: "draft", recruiters: 0, candidates: 0 },
];

export default function AdminJobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jobb</h1>
        <p className="text-muted-foreground">Alla jobbannonser på plattformen</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Sök jobb..." className="pl-10 max-w-md" />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-medium text-muted-foreground">Titel</th>
                <th className="p-4 font-medium text-muted-foreground">Företag</th>
                <th className="p-4 font-medium text-muted-foreground">Plats</th>
                <th className="p-4 font-medium text-muted-foreground">Lön</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Rekryterare</th>
                <th className="p-4 font-medium text-muted-foreground">Kandidater</th>
                <th className="p-4 font-medium text-muted-foreground">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_JOBS.map((job) => (
                <tr key={job.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-medium">{job.title}</td>
                  <td className="p-4">{job.company}</td>
                  <td className="p-4 text-muted-foreground">{job.location}</td>
                  <td className="p-4">{formatCurrency(job.salary)}</td>
                  <td className="p-4"><StatusBadge status={job.status} /></td>
                  <td className="p-4">{job.recruiters}/5</td>
                  <td className="p-4">{job.candidates}</td>
                  <td className="p-4"><Button size="sm" variant="outline" className="h-7 text-xs">Visa</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
