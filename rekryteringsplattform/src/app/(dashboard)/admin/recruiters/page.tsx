import { getAdminRecruiters } from "@/lib/actions/admin";
import { AdminRecruitersTable } from "@/components/dashboard/admin/admin-recruiters-table";
import { getDictionary } from "@/i18n/server";

export default async function AdminRecruitersPage() {
  const recruiters = await getAdminRecruiters();
  const dict = await getDictionary();
  const a = dict.admin;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{a.recruitersPageTitle}</h1>
        <p className="text-muted-foreground">{a.recruitersPageSubtitle.replace("{count}", String(recruiters.length))}</p>
      </div>

      <AdminRecruitersTable recruiters={recruiters} />
    </div>
  );
}
