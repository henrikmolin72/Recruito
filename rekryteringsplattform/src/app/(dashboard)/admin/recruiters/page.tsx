import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, ShieldAlert } from "lucide-react";
import { getAdminRecruiters } from "@/lib/actions/admin";
import { RecruiterApprovalActions, RecruiterManageActions } from "@/components/dashboard/admin/recruiter-approval-actions";
import { getDictionary } from "@/i18n/server";
import { formatDateShort } from "@/lib/utils";

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

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-4 font-medium text-muted-foreground">{a.tableRecruiter}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableJoiningDate}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableStatusColumn}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableActiveCandidates}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableRejected}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tablePlacements}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableRating}</th>
                <th className="p-4 font-medium text-muted-foreground">{a.tableActions}</th>
              </tr>
            </thead>
            <tbody>
              {recruiters.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{a.noRecruitersRegistered}</td></tr>
              ) : (
                recruiters.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <Link href={`/admin/recruiters/${r.id}`} className="flex items-center gap-3 group">
                        <Avatar initials={r.name.split(" ").map((n: string) => n[0]).join("")} size="sm" />
                        <div>
                          <p className="font-medium group-hover:text-brand-600">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                          {!r.legalEligibilityConfirmed && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-[11px] font-semibold text-danger-700">
                              <ShieldAlert className="h-3 w-3" />
                              Not eligible
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="p-4 text-muted-foreground">{r.joinedAt ? formatDateShort(r.joinedAt) : dict.common.noDataDash}</td>
                    <td className="p-4">
                      <Badge variant={r.status === "approved" ? "success" : r.status === "pending" ? "warning" : "danger"}>
                        {r.status === "approved" ? a.statusApproved : r.status === "pending" ? a.statusPending : r.status === "rejected" ? a.statusRejected : a.statusSuspended}
                      </Badge>
                    </td>
                    <td className="p-4">{r.activeCandidates}</td>
                    <td className="p-4">{r.rejectedCandidates}</td>
                    <td className="p-4">{r.placements}</td>
                    <td className="p-4">
                      {r.rating > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-warning-500 text-warning-500" />
                          <span>{r.rating}</span>
                        </div>
                      ) : dict.common.noDataDash}
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
