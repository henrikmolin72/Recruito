import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { getAdminCompanies } from "@/lib/actions/admin";

export default async function AdminCompaniesPage() {
  const companies = await getAdminCompanies();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Företag</h1>
        <p className="text-muted-foreground">Hantera registrerade företag ({companies.length} totalt)</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-medium text-muted-foreground">Företag</th>
                <th className="p-4 font-medium text-muted-foreground">Org.nr</th>
                <th className="p-4 font-medium text-muted-foreground">Kontakt</th>
                <th className="p-4 font-medium text-muted-foreground">Bransch</th>
                <th className="p-4 font-medium text-muted-foreground">Aktiva jobb</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">Inga företag registrerade</td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="border-b border-border last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-brand-50 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-brand-600" />
                        </div>
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.email || "Ingen e-post"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{company.org_number || "—"}</td>
                    <td className="p-4">{company.contact || "—"}</td>
                    <td className="p-4">
                      {company.industry ? <Badge variant="outline">{company.industry}</Badge> : "—"}
                    </td>
                    <td className="p-4">{company.jobs}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
