import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Search } from "lucide-react";

const MOCK_COMPANIES = [
  { id: 1, name: "TechCorp AB", org: "556789-1234", contact: "Maria Johansson", jobs: 4, placements: 2, status: "active" },
  { id: 2, name: "FinanceHQ", org: "556123-4567", contact: "Anders Ek", jobs: 2, placements: 1, status: "active" },
  { id: 3, name: "DesignHub AB", org: "556456-7890", contact: "Sara Ström", jobs: 1, placements: 0, status: "active" },
  { id: 4, name: "SalesForce Nordic", org: "556111-2222", contact: "Peter Berg", jobs: 3, placements: 0, status: "active" },
  { id: 5, name: "ConsultCo", org: "556333-4444", contact: "Lisa Nyman", jobs: 1, placements: 0, status: "inactive" },
];

export default function AdminCompaniesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Företag</h1>
        <p className="text-muted-foreground">Hantera registrerade företag</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Sök företag..." className="pl-10 max-w-md" />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-medium text-muted-foreground">Företag</th>
                <th className="p-4 font-medium text-muted-foreground">Org.nr</th>
                <th className="p-4 font-medium text-muted-foreground">Kontaktperson</th>
                <th className="p-4 font-medium text-muted-foreground">Jobb</th>
                <th className="p-4 font-medium text-muted-foreground">Placeringar</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_COMPANIES.map((company) => (
                <tr key={company.id} className="border-b border-border last:border-0">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-brand-50 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-brand-600" />
                      </div>
                      <span className="font-medium">{company.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{company.org}</td>
                  <td className="p-4">{company.contact}</td>
                  <td className="p-4">{company.jobs}</td>
                  <td className="p-4">{company.placements}</td>
                  <td className="p-4">
                    <Badge variant={company.status === "active" ? "success" : "default"}>
                      {company.status === "active" ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Button size="sm" variant="outline" className="h-7 text-xs">Visa</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
