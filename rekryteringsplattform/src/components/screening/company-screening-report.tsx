import { MarkdownReport } from "@/components/screening/markdown-report";
import { AiReportDialog } from "@/components/screening/ai-report-dialog";
import { getCompanyCandidateScreening } from "@/lib/actions/screening";
import { getDictionary } from "@/i18n/server";

// Full AI screening report — CLIENT-ONLY decision-support tool (client request
// 2026-07-02). Recruiters never see this; only the company reviewing the
// candidate. Rendered as a "View AI Report" button opening a modal (client
// request 2026-07-07) so the page stays short and the report is reachable in
// every stage. Always carries the "decision support only" disclaimer because
// clients reject for factors AI can't evaluate (location, culture fit, salary…).
export async function CompanyScreeningReport({ candidateId }: { candidateId: string }) {
    const report = await getCompanyCandidateScreening(candidateId);
    if (!report) return null;
    const dict = await getDictionary();
    const c = dict.company;
    return (
        <AiReportDialog buttonLabel={c.viewAiReport} title={c.aiReportTitle} closeLabel={dict.common.close}>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                {c.aiReportDisclaimer}
            </div>
            <MarkdownReport markdown={report.reportMarkdown} />
        </AiReportDialog>
    );
}
