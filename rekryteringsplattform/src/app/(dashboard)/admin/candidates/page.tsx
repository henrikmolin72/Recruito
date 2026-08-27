import { getCandidatesForScreening } from "@/lib/actions/admin";
import { CandidateScreeningTable } from "@/components/dashboard/admin/candidate-screening-table";

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

            {/* The table component owns its card + the company-style stage tabs/filters. */}
            <CandidateScreeningTable candidates={candidates} />
        </div>
    );
}
