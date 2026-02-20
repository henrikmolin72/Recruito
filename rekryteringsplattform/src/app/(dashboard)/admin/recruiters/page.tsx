import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { getAdminRecruiters } from "@/lib/actions/admin";
import { RecruiterApprovalActions, RecruiterManageActions } from "@/components/dashboard/admin/recruiter-approval-actions";

export default async function AdminRecruitersPage() {
  const recruiters = await getAdminRecruiters();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rekryterare</h1>
        <p className="text-muted-foreground">Hantera rekryterare på plattformen ({recruiters.length} totalt)</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-medium text-muted-foreground">Rekryterare</th>
                <th className="p-4 font-medium text-muted-foreground">Titel</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Placeringar</th>
                <th className="p-4 font-medium text-muted-foreground">Betyg</th>
                <th className="p-4 font-medium text-muted-foreground">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {recruiters.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Inga rekryterare registrerade</td></tr>
              ) : (
                recruiters.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar initials={r.name.split(" ").map((n: string) => n[0]).join("")} size="sm" />
                        <div>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{r.headline || "—"}</td>
                    <td className="p-4">
                      <Badge variant={r.status === "approved" ? "success" : r.status === "pending" ? "warning" : "danger"}>
                        {r.status === "approved" ? "Godkänd" : r.status === "pending" ? "Väntande" : r.status === "rejected" ? "Nekad" : "Avstängd"}
                      </Badge>
                    </td>
                    <td className="p-4">{r.placements}</td>
                    <td className="p-4">
                      {r.rating > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-warning-500 text-warning-500" />
                          <span>{r.rating}</span>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="p-4">
                      {r.status === "pending" ? (
                        <RecruiterApprovalActions recruiterId={r.id} />
                      ) : (
                        <RecruiterManageActions recruiterId={r.id} status={r.status} />
                      )}
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
