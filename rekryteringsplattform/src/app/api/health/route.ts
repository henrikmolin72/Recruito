import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
// Health probe must never be cached — Vercel/load balancers need a live signal.
export const dynamic = "force-dynamic";

type CheckResult = "ok" | "fail" | "skipped";

async function checkSupabase(): Promise<{ status: CheckResult; latencyMs: number }> {
    const started = Date.now();
    try {
        const admin = createAdminClient();
        // rate_limits is a small, always-present, service-role-only table — cheap probe.
        const { error } = await admin.from("rate_limits").select("key").limit(1);
        if (error) {
            // Log the raw error server-side only — never surface schema/SQL to the
            // unauthenticated caller (CLAUDE.md §6).
            console.error("[health] supabase probe failed:", error.message);
            return { status: "fail", latencyMs: Date.now() - started };
        }
        return { status: "ok", latencyMs: Date.now() - started };
    } catch (err: any) {
        console.error("[health] supabase probe threw:", err?.message ?? "unknown");
        return { status: "fail", latencyMs: Date.now() - started };
    }
}

function checkEmail(): CheckResult {
    // We don't ping Resend on every health call — it would burn rate-limit budget
    // and tie liveness to a third party. Just verify config is present.
    if (process.env.RESEND_API_KEY) return "ok";
    if (process.env.SMTP_HOST && process.env.SMTP_USER) return "ok";
    return "fail";
}

export async function GET() {
    const supabase = await checkSupabase();
    const email = checkEmail();

    const allOk = supabase.status === "ok" && email === "ok";

    return NextResponse.json(
        {
            ok: allOk,
            timestamp: new Date().toISOString(),
            checks: {
                supabase: {
                    status: supabase.status,
                    latencyMs: supabase.latencyMs,
                },
                email: { status: email },
            },
        },
        {
            status: allOk ? 200 : 503,
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
            },
        },
    );
}
