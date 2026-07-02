import { Card, CardContent } from "@/components/ui/card";
import { MarkdownReport } from "@/components/screening/markdown-report";
import { getCompanyCandidateScreening } from "@/lib/actions/screening";

// Full AI screening report — CLIENT-ONLY decision-support tool (client request
// 2026-07-02). Recruiters never see this; only the company reviewing the
// candidate. Always carries the "decision support only" disclaimer because
// clients reject for factors AI can't evaluate (location, culture fit, salary…).
export async function CompanyScreeningReport({ candidateId }: { candidateId: string }) {
    const report = await getCompanyCandidateScreening(candidateId);
    if (!report) return null;
    return (
        <Card>
            <CardContent className="p-5 space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">AI screening report</h2>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    This AI screening is decision support only. It evaluates the CV against the job description and
                    cannot account for interview performance, location or commuting preferences, team or cultural fit,
                    salary expectations, or other business considerations. Final hiring decisions are always yours.
                </div>
                <MarkdownReport markdown={report.reportMarkdown} />
            </CardContent>
        </Card>
    );
}
