import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * GDPR CV Cleanup endpoint.
 *
 * Deletes CV files from Supabase Storage for candidates whose recruitment
 * process ended more than 6 months ago (terminal statuses).
 *
 * Secured via a shared secret in the GDPR_CLEANUP_SECRET env var.
 * Designed to be called by a cron job (e.g., Vercel Cron, pg_cron, or
 * an external scheduler) on a daily/weekly basis.
 *
 * POST /api/gdpr-cleanup
 * Headers: { Authorization: Bearer <GDPR_CLEANUP_SECRET> }
 */
export async function POST(request: NextRequest) {
    const secret = process.env.GDPR_CLEANUP_SECRET;
    if (!secret) {
        return NextResponse.json(
            { error: "GDPR_CLEANUP_SECRET is not configured" },
            { status: 500 }
        );
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (token !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const terminalStatuses = [
        "rejected",
        "declined",
        "completed",
        "candidate_withdrawn",
        "rejected_client",
        "rejected_interview",
        "offer_declined",
        "duplicate_rejected",
    ];

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Find candidates with CV files in terminal status older than 6 months
    const { data: candidates, error: fetchError } = await admin
        .from("candidates")
        .select("id, cv_file_path, status, status_changed_at")
        .not("cv_file_path", "is", null)
        .in("status", terminalStatuses)
        .lt("status_changed_at", sixMonthsAgo.toISOString());

    if (fetchError) {
        console.error("GDPR cleanup: failed to fetch candidates", fetchError);
        return NextResponse.json(
            { error: "Failed to query candidates" },
            { status: 500 }
        );
    }

    if (!candidates || candidates.length === 0) {
        return NextResponse.json({ ok: true, deleted: 0, message: "No CV files to clean up" });
    }

    let deletedCount = 0;
    const errors: string[] = [];

    for (const candidate of candidates) {
        const filePath = candidate.cv_file_path;
        if (!filePath) continue;

        // Delete file from Storage
        const { error: storageError } = await admin.storage
            .from("cvs")
            .remove([filePath]);

        if (storageError) {
            console.error(`GDPR cleanup: failed to delete file ${filePath}`, storageError);
            errors.push(`${candidate.id}: ${storageError.message}`);
            continue;
        }

        // Null out the cv_file_path in the database
        const { error: updateError } = await admin
            .from("candidates")
            .update({ cv_file_path: null, updated_at: new Date().toISOString() })
            .eq("id", candidate.id);

        if (updateError) {
            console.error(`GDPR cleanup: failed to update candidate ${candidate.id}`, updateError);
            errors.push(`${candidate.id}: update failed`);
            continue;
        }

        deletedCount++;
    }

    // Also clean up application CV files from metadata
    const { data: applications, error: appFetchError } = await admin
        .from("applications")
        .select("id, metadata")
        .not("metadata", "is", null);

    if (!appFetchError && applications) {
        for (const app of applications) {
            const meta = app.metadata as Record<string, unknown> | null;
            const cvPath = meta?.cv_file_path as string | undefined;
            if (!cvPath) continue;

            // Check if the application is old enough (created > 6 months ago)
            const { data: appData } = await admin
                .from("applications")
                .select("created_at")
                .eq("id", app.id)
                .single();

            if (appData && new Date(appData.created_at) < sixMonthsAgo) {
                const { error: rmError } = await admin.storage
                    .from("cvs")
                    .remove([cvPath]);

                if (!rmError) {
                    // Remove cv_file_path from metadata
                    const updatedMeta = { ...meta };
                    delete updatedMeta.cv_file_path;
                    await admin
                        .from("applications")
                        .update({ metadata: updatedMeta, updated_at: new Date().toISOString() })
                        .eq("id", app.id);
                    deletedCount++;
                }
            }
        }
    }

    console.log(`GDPR cleanup completed: ${deletedCount} files deleted, ${errors.length} errors`);

    return NextResponse.json({
        ok: true,
        deleted: deletedCount,
        errors: errors.length > 0 ? errors : undefined,
        totalCandidatesChecked: candidates.length,
    });
}
