import { getAdminCompanies } from "@/lib/actions/admin";
import { getDictionary } from "@/i18n/server";
import { AdminCompaniesList } from "@/components/admin/admin-companies-list";

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

      <AdminCompaniesList companies={companies} />
    </div>
  );
}
