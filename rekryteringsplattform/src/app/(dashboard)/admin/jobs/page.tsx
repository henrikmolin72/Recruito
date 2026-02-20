import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";
import { getAdminJobs } from "@/lib/actions/admin";

export default async function AdminJobsPage() {
  const jobs = await getAdminJobs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jobb</h1>
        <p className="text-muted-foreground">Alla jobbannonser på plattformen ({jobs.length} totalt)</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-medium text-muted-foreground">Titel</th>
                <th className="p-4 font-medium text-muted-foreground">Företag</th>
                <th className="p-4 font-medium text-muted-foreground">Plats</th>
                <th className="p-4 font-medium text-muted-foreground">Lön</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Rekryterare</th>
                <th className="p-4 font-medium text-muted-foreground">Kandidater</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">Inga jobb registrerade</td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border last:border-0">
                    <td className="p-4 font-medium">{job.title}</td>
                    <td className="p-4">{job.company}</td>
                    <td className="p-4 text-muted-foreground">{job.location || "—"}</td>
                    <td className="p-4">{job.salary ? formatCurrency(job.salary) : "Ej angivet"}</td>
                    <td className="p-4"><StatusBadge status={job.status} /></td>
                    <td className="p-4">{job.recruiters}/{job.maxRecruiters}</td>
                    <td className="p-4">{job.candidates}</td>
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
