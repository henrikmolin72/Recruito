import type { CandidateStageHistory } from "@/types/db-types";

// Localized labels passed from the server component so this stays a pure
// presentational component (no dictionary import / no client boundary needed).
type StageHistoryLabels = {
    title: string;
    empty: string;
    by: string; // "by {role}"
    reason: string; // "Reason: {reason}"
    actions: Record<CandidateStageHistory["action"], string>;
    stageNames: Record<string, string>;
};

function stageLabel(value: string | null, stageNames: Record<string, string>) {
    if (!value) return "—";
    return stageNames[value] ?? value;
}

export function CandidateStageHistoryTimeline({
    rows,
    labels,
}: {
    rows: CandidateStageHistory[];
    labels: StageHistoryLabels;
}) {
    if (rows.length === 0) {
        return <p className="text-sm text-muted-foreground">{labels.empty}</p>;
    }

    return (
        <ol className="space-y-4">
            {rows.map((row) => (
                <li key={row.id} className="flex gap-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                            <span className="font-semibold text-slate-900">
                                {labels.actions[row.action] ?? row.action}
                            </span>
                            <span className="text-slate-500">
                                {stageLabel(row.from_stage, labels.stageNames)} → {stageLabel(row.to_stage, labels.stageNames)}
                            </span>
                            {row.changed_by_role && (
                                <span className="text-xs text-muted-foreground">
                                    {labels.by.replace("{role}", row.changed_by_role)}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {new Date(row.created_at).toLocaleString()}
                        </p>
                        {row.reason && (
                            <p className="mt-1 text-xs italic text-slate-600">
                                {labels.reason.replace("{reason}", row.reason)}
                            </p>
                        )}
                    </div>
                </li>
            ))}
        </ol>
    );
}
