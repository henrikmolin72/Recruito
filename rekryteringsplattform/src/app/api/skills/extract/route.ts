/**
 * POST /api/skills/extract
 * Called after an AI screening to persist extracted skills into candidate_skills.
 * Matches skill names from AI output against the skills taxonomy.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bodySchema = z.object({
    applicationId: z.string().uuid().optional(),
    candidateId: z.string().uuid().optional(),
    presentSkills: z.array(z.string()).default([]),   // top matched skills
    missingSkills: z.array(z.string()).default([]),   // gap skills
});

async function matchSkills(admin: ReturnType<typeof createAdminClient>, names: string[]) {
    if (names.length === 0) return [];

    const { data } = await admin
        .from("skills")
        .select("id, name, aliases")
        .limit(200);

    if (!data) return [];

    const matched: string[] = [];
    for (const name of names) {
        const lower = name.toLowerCase().trim();
        const found = data.find(
            (s) =>
                s.name.toLowerCase() === lower ||
                (s.aliases || []).some((a: string) => a.toLowerCase() === lower)
        );
        if (found) matched.push(found.id);
    }
    return matched;
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const { applicationId, candidateId, presentSkills, missingSkills } = parsed.data;
    if (!applicationId && !candidateId) {
        return NextResponse.json({ error: "applicationId or candidateId required" }, { status: 400 });
    }
    if (applicationId && candidateId) {
        return NextResponse.json({ error: "Provide applicationId or candidateId, not both" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Authorization: verify caller is admin or owns the target application/candidate
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    const isAdmin = profile?.role === "admin";

    if (!isAdmin) {
        const { data: recruiter } = await admin.from("recruiters").select("id").eq("user_id", user.id).single();
        if (!recruiter) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        if (applicationId) {
            const { data: app } = await admin.from("applications").select("recruiter_id").eq("id", applicationId).single();
            if (!app || app.recruiter_id !== recruiter.id) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        } else if (candidateId) {
            const { data: candidate } = await admin.from("candidates").select("recruiter_id").eq("id", candidateId).single();
            if (!candidate || candidate.recruiter_id !== recruiter.id) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }
    }

    const presentIds = await matchSkills(admin, presentSkills);
    const missingIds = await matchSkills(admin, missingSkills);

    const rows = [
        ...presentIds.map((skillId) => ({
            skill_id: skillId,
            application_id: applicationId ?? null,
            candidate_id: candidateId ?? null,
            source: "ai_extracted" as const,
            is_gap: false,
        })),
        ...missingIds.map((skillId) => ({
            skill_id: skillId,
            application_id: applicationId ?? null,
            candidate_id: candidateId ?? null,
            source: "ai_extracted" as const,
            is_gap: true,
        })),
    ];

    if (rows.length === 0) {
        return NextResponse.json({ ok: true, inserted: 0 });
    }

    const { error } = await admin
        .from("candidate_skills")
        .upsert(rows, { onConflict: applicationId ? "application_id,skill_id" : "candidate_id,skill_id", ignoreDuplicates: true });

    if (error) {
        console.error("Failed to insert candidate_skills:", error);
        return NextResponse.json({ error: "Failed to persist skills" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inserted: rows.length });
}
