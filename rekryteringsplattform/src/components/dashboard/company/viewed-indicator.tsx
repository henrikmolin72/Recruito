import { Eye } from "lucide-react";

// Eye marker shown only on candidates this company has already opened
// (company_viewed_at set on first detail view — the same field the recruiter
// page uses for its Seen/Not-seen badge). Absent = not yet viewed.
export function ViewedIndicator({ viewed, label }: { viewed: boolean; label: string }) {
  if (!viewed) return null;
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex shrink-0 items-center text-emerald-600"
    >
      <Eye className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}
