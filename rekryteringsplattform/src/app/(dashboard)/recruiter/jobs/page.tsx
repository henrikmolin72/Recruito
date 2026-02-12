import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Building2, Banknote, Users, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const MOCK_AVAILABLE_JOBS = [
  { id: 1, title: "UX Designer Senior", company: "DesignHub AB", location: "Stockholm", salary: 600000, industry: "IT & Tech", recruiters: 2, created: "2025-02-05" },
  { id: 2, title: "Ekonomichef", company: "AccountFirm", location: "Göteborg", salary: 840000, industry: "Finans & Bank", recruiters: 1, created: "2025-02-03" },
  { id: 3, title: "Sales Director Nordic", company: "SalesForce Nordic", location: "Remote (Norden)", salary: 960000, industry: "Sälj & Marknad", recruiters: 3, created: "2025-02-01" },
  { id: 4, title: "Java Backend Developer", company: "BankTech AB", location: "Malmö", salary: 720000, industry: "Finans & Bank", recruiters: 0, created: "2025-02-08" },
  { id: 5, title: "IT-projektledare", company: "ConsultCo", location: "Uppsala", salary: 660000, industry: "IT & Tech", recruiters: 4, created: "2025-01-28" },
];

export default function RecruiterJobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bläddra jobb</h1>
        <p className="text-muted-foreground">Hitta uppdrag som matchar ditt nätverk</p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Sök jobbroll, bransch, ort..." className="pl-10" />
        </div>
        <select className="h-10 rounded-lg border border-input bg-white px-3 text-sm">
          <option>Alla branscher</option>
          <option>IT & Tech</option>
          <option>Finans & Bank</option>
          <option>Sälj & Marknad</option>
        </select>
        <select className="h-10 rounded-lg border border-input bg-white px-3 text-sm">
          <option>Alla orter</option>
          <option>Stockholm</option>
          <option>Göteborg</option>
          <option>Malmö</option>
          <option>Remote</option>
        </select>
      </div>

      <div className="grid gap-4">
        {MOCK_AVAILABLE_JOBS.map((job) => (
          <Card key={job.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{job.title}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {job.company}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
                    <span className="flex items-center gap-1"><Banknote className="h-3.5 w-3.5" /> {formatCurrency(job.salary)}</span>
                  </div>
                </div>
                <Badge variant="outline">{job.industry}</Badge>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-1.5 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className={job.recruiters >= 4 ? "text-warning-500" : ""}>{job.recruiters}/5 rekryterare</span>
                </div>
                <span className="text-sm text-muted-foreground">Avgift: {formatCurrency(job.salary * 0.15 * 0.75)}</span>
                <div className="ml-auto">
                  <Button size="sm" className={job.recruiters >= 5 ? "opacity-50" : "bg-success-500 hover:bg-success-700"}>
                    {job.recruiters >= 5 ? "Fullt" : "Ta mandat"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
