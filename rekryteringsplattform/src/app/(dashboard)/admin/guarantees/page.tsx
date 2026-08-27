import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getAdminPlacements } from "@/lib/actions/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/actions/require-admin";
import { getDictionary } from "@/i18n/server";
import {
    PlacementActionButtons,
    ProcessGuaranteeButton,
    JoiningDateCell,
} from "@/components/dashboard/admin/placement-actions";
import { GuaranteeBreachReviewList } from "@/components/guarantee/breach-review-list";

const TERMINAL_STATUSES = ["payout_released", "guarantee_failed", "refund_processing"];

async function getBreachReports() {
    const admin = createAdminClient();
    const { data } = await admin
        .from("guarantee_breach_reports")
        .select(`
            id, reason, notes, end_date, refund_amount, refund_currency,
            admin_status, created_at,
            placement:placements(
                id, total_fee, salary_currency,
                candidate:candidates!placements_candidate_id_fkey(first_name, last_name),
                job:jobs(title),
                company:companies(company_name)
            )
        `)
        .order("created_at", { ascending: false });
    return data ?? [];
}

export default async function AdminGuaranteesPage() {
    await requireAdmin();
    const [placements, breachReports, dict] = await Promise.all([
        getAdminPlacements(),
        getBreachReports(),
        getDictionary(),
    ]);
    const a = dict.admin;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Shield className="h-6 w-6 text-brand-600" />
                        {a.guaranteesPageTitle}
                    </h1>
                    <p className="text-muted-foreground">{a.guaranteesPageSubtitle.replace("{count}", String(placements.length))}</p>
                </div>
                <ProcessGuaranteeButton />
            </div>

            <Card>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm min-w-[1300px]">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th className="p-4 font-medium text-muted-foreground">{a.tablePlacementJob}</th>
                                <th className="p-4 font-medium text-muted-foreground">{a.tablePlacementCompany}</th>
                                <th className="p-4 font-medium text-muted-foreground">{a.tablePlacementCandidate}</th>
                                <th className="p-4 font-medium text-muted-foreground">{a.tableTotalFee}</th>
                                <th className="p-4 font-medium text-muted-foreground">{a.tablePlatformFee}</th>
                                <th className="p-4 font-medium text-muted-foreground">{a.tableRecruiterFee}</th>
                                <th className="p-4 font-medium text-muted-foreground">{a.tablePlacementStatus}</th>
                                <th className="p-4 font-medium text-muted-foreground">{a.tablePlacementJoining}</th>
                                <th className="p-4 font-medium text-muted-foreground">{a.tablePlacementGuaranteeEnds}</th>
                                <th className="p-4 font-medium text-muted-foreground">{a.tablePlacementActions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {placements.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-muted-foreground">{a.noPlacementsRegistered}</td>
                                </tr>
                            ) : (
                                placements.map((placement) => (
                                    <tr key={placement.id} className="border-b border-border last:border-0">
                                        <td className="p-4 font-medium">{placement.job}</td>
                                        <td className="p-4">{placement.company}</td>
                                        <td className="p-4">{placement.candidate}</td>
                                        <td className="p-4 font-medium">{formatCurrency(placement.totalFee)}</td>
                                        <td className="p-4 text-brand-600">{formatCurrency(placement.platformFee)}</td>
                                        <td className="p-4 text-success-700">{formatCurrency(placement.recruiterFee)}</td>
                                        <td className="p-4"><StatusBadge status={placement.status} /></td>
                                        <td className="p-4 text-xs">
                                            <JoiningDateCell
                                                placementId={placement.id}
                                                joiningDate={placement.joiningDate}
                                                locked={TERMINAL_STATUSES.includes(placement.status)}
                                            />
                                        </td>
                                        <td className="p-4 text-xs text-muted-foreground">
                                            {placement.guaranteeEndDate ? formatDate(placement.guaranteeEndDate) : "—"}
                                        </td>
                                        <td className="p-4">
                                            <PlacementActionButtons
                                                placementId={placement.id}
                                                status={placement.status}
                                                joiningDate={placement.joiningDate}
                                                guaranteeEndDate={placement.guaranteeEndDate}
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {breachReports.length > 0 && (
                <Card className="border-none shadow-xl shadow-slate-200/50">
                    <CardContent className="p-6 space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
                            {a.guaranteeBreachReports.replace("{count}", String(breachReports.length))}
                        </h2>
                        <GuaranteeBreachReviewList reports={breachReports} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
