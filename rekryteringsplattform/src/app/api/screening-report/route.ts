import { NextRequest, NextResponse } from "next/server";
import { authorizeMandate } from "@/lib/screening/eval-data";
import { runCandidateEvaluation } from "@/lib/screening/run-evaluation";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const candidateId = body?.candidateId as string | undefined;
    const mandateId = body?.mandateId as string | undefined;
    if (!candidateId || !mandateId) {
      return NextResponse.json({ error: "Missing candidateId or mandateId" }, { status: 400 });
    }

    const auth = await authorizeMandate(mandateId);
    if ("error" in auth) {
      const status = auth.error === "Not authenticated" ? 401 : 403;
      return NextResponse.json({ error: auth.error }, { status });
    }
    const { admin, userId, isAdmin } = auth;

    const rateLimit = await consumeRateLimit({
      key: `api:screening-report:user:${userId}`,
      limit: 15,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // A recruiter running the eval is a self-check: produce + store the report,
    // but never set the company-visible ai_match_score. Only Recruito (admin) runs
    // own that score.
    const result = await runCandidateEvaluation({
      admin,
      mandateId,
      candidateId,
      actorUserId: userId,
      setScore: isAdmin,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      reportMarkdown: result.reportMarkdown,
      modelVersion: result.modelVersion,
      matchScore: result.matchScore,
      criticalGaps: result.criticalGaps,
      injectionFlagged: result.injectionFlagged,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[screening-report]", err);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
