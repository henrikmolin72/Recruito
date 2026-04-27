import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getCandidatesForScreening } from "@/lib/actions/admin";
import { MarkScreenedButton } from "@/components/dashboard/admin/mark-screened-button";

export default async function AdminCandidatesPage() {
    const candidates = await getCandidatesForScreening();
    const pendingCount = candidates.filter((c) => !c.screenedAt).length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Candidate Screening</h1>
                <p className="text-muted-foreground">
                    Step 7 of the recruitment flow — mark candidates as Recruito-screened before clients see them.
                    {" "}
                    <span className="font-semibold text-amber-600">{pendingCount}</span> pending review.
                </p>
            </div>

            <Card>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm min-w-[960px]">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th className="p-4 font-medium text-muted-foreground">Candidate</th>
                                <th className="p-4 font-medium text-muted-foreground">Job</th>
                                <th className="p-4 font-medium text-muted-foreground">Company</th>
                                <th className="p-4 font-medium text-muted-foreground">Recruiter</th>
                                <th className="p-4 font-medium text-muted-foreground">AI Match</th>
                                <th className="p-4 font-medium text-muted-foreground">Status</th>
                                <th className="p-4 font-medium text-muted-foreground">Submitted</th>
                                <th className="p-4 font-medium text-emerald-700">Screening</th>
                            </tr>
                        </thead>
                        <tbody>
                            {candidates.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                        No candidates submitted yet.
                                    </td>
                                </tr>
                            ) : (
                                candidates.map((c) => (
                                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                                        <td className="p-4">
                                            <div className="font-medium">{c.name}</div>
                                            {c.currentTitle && (
                                                <div className="text-xs text-muted-foreground">{c.currentTitle}</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-muted-foreground">{c.jobTitle}</td>
                                        <td className="p-4 text-muted-foreground">{c.companyName}</td>
                                        <td className="p-4 text-muted-foreground">{c.recruiterName}</td>
                                        <td className="p-4 tabular-nums">
                                            {c.aiMatchScore !== null && c.aiMatchScore !== undefined ? `${c.aiMatchScore}%` : "—"}
                                        </td>
                                        <td className="p-4"><StatusBadge status={c.status} /></td>
                                        <td className="p-4 text-xs text-muted-foreground">
                                            {new Date(c.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <MarkScreenedButton
                                                candidateId={c.id}
                                                alreadyScreened={Boolean(c.screenedAt)}
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
