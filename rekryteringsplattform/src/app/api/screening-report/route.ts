import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID, createHash } from "crypto";
import { authorizeMandate, gatherEvalData } from "@/lib/screening/eval-data";
import { extractMatchScore } from "@/lib/screening/extract-match-score";
import { fillEvaluationPrompt } from "@/lib/screening/evaluation-prompt";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

function cvMimeFromPath(path: string): "application/pdf" | "text/plain" | null {
  const lower = path.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".txt")) return "text/plain";
  return null;
}

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

    const data = await gatherEvalData(admin, mandateId, candidateId);
    if ("error" in data) {
      return NextResponse.json({ error: data.error }, { status: 404 });
    }

    if (!data.cvPath) {
      return NextResponse.json({ error: "no_cv" }, { status: 422 });
    }
    const mediaType = cvMimeFromPath(data.cvPath);
    if (!mediaType) {
      // DOCX etc. can't be sent as an Anthropic document — fall back to copy flow.
      return NextResponse.json({ error: "unsupported_cv_format" }, { status: 422 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

    // Download the CV from storage and hash it for the audit trail.
    const { data: cvBlob, error: dlError } = await admin.storage.from("cvs").download(data.cvPath);
    if (dlError || !cvBlob) {
      return NextResponse.json({ error: "Could not load CV" }, { status: 500 });
    }
    const cvBytes = Buffer.from(await cvBlob.arrayBuffer());
    if (cvBytes.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "CV file too large" }, { status: 422 });
    }
    const cvHash = createHash("sha256").update(cvBytes).digest("hex");
    const base64 = cvBytes.toString("base64");

    const screeningId = randomUUID();
    const prompt = fillEvaluationPrompt({
      jdText: data.jdText,
      config: data.config,
      metadata: {
        screeningId,
        modelVersion: model,
        isoTimestamp: new Date().toISOString(),
        jdId: data.jobId,
        cvHash,
      },
    });

    const qaBlock = data.screeningAnswers.length > 0
      ? data.screeningAnswers
          .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || "(no answer provided)"}`)
          .join("\n\n")
      : "(no screening questions for this role)";

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model,
      max_tokens: 8000,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: mediaType, data: base64 },
            } as any,
            {
              type: "text",
              text: `${prompt}\n\n══════════════════════════════════════════════════════════════════\nSCREENING QUESTIONS & ANSWERS\n══════════════════════════════════════════════════════════════════\n${qaBlock}`,
            },
          ],
        },
      ],
    });

    const reportMarkdown = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text)
      .join("")
      .trim();

    if (!reportMarkdown) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    // Store for re-views + audit trail. Failure to store shouldn't lose the report.
    const { error: insertError } = await admin.from("candidate_screenings").insert({
      screening_id: screeningId,
      candidate_id: candidateId,
      mandate_id: mandateId,
      job_id: data.jobId,
      recruiter_user_id: userId,
      report_markdown: reportMarkdown,
      model_version: model,
      cv_hash: cvHash,
    });
    if (insertError) {
      console.error("[screening-report] store", insertError);
    }

    // Populate the candidate's company-visible queue score from the report —
    // ONLY when Recruito (admin) runs the evaluation. A recruiter running the
    // eval is a self-check: they get the full report (stored above) but must not
    // set the client-facing score, which is Recruito's independent verdict.
    const matchScore = extractMatchScore(reportMarkdown);
    if (isAdmin && matchScore !== null) {
      // Only fill the queue score when it's currently blank, so a re-run never
      // clobbers an already-set value. The full report always refreshes.
      const { error: scoreError } = await admin
        .from("candidates")
        .update({ ai_match_score: matchScore })
        .eq("id", candidateId)
        .is("ai_match_score", null);
      if (scoreError) console.error("[screening-report] ai_match_score update", { code: scoreError.code, message: scoreError.message });
    }

    return NextResponse.json({
      reportMarkdown,
      modelVersion: model,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[screening-report]", err);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
