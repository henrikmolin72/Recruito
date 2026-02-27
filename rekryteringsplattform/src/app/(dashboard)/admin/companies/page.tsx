import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { getAdminCompanies } from "@/lib/actions/admin";
import { CompanyVerificationActions } from "@/components/dashboard/admin/company-verification-actions";
import { getDictionary } from "@/i18n/server";

export default async function AdminCompaniesPage() {
  const companies = await getAdminCompanies();
  const dict = await getDictionary();
  const a = dict.admin;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{a.companiesPageTitle}</h1>
        <p className="text-muted-foreground">{a.companiesPageSubtitle.replace("{count}", String(companies.length))}</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-medium text-muted-foreground">{a.tableCompany}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableOrgNumber}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableContact}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableIndustry}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableActiveJobs}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableVerification}</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">{a.noCompaniesRegistered}</td>
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
                          <p className="text-xs text-muted-foreground">{company.email || a.noEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{company.org_number || dict.common.noDataDash}</td>
                    <td className="p-4">{company.contact || dict.common.noDataDash}</td>
                    <td className="p-4">
                      {company.industry ? <Badge variant="outline">{company.industry}</Badge> : dict.common.noDataDash}
                    </td>
                    <td className="p-4">{company.jobs}</td>
                    <td className="p-4">
                      <CompanyVerificationActions
                        companyId={company.id}
                        isVerified={company.is_verified}
                        orgNumber={company.org_number}
                      />
                    </td>
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
