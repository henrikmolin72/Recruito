/**
 * CSV cell escaping shared across export routes.
 *
 * Why: CLAUDE.md §6 requires CSV exports to escape leading =, +, -, @ (and
 * tab/CR) so spreadsheet apps don't execute user-controlled values as formulas
 * (formula/CSV injection). Also doubles embedded quotes and wraps in quotes.
 */
export function csvEscapeCell(value: unknown): string {
    let s = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
}
