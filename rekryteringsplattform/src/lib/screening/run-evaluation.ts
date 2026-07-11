// Server-side candidate AI evaluation core. Extracted from /api/screening-report
// so it can be reused both by that route (recruiter/admin on-demand) and by the
// Recruito approval action (markCandidateRecruitoScreened, auto-run on approval).
//
// The caller owns authorization — this function does NOT check cookies/roles.
// `setScore` gates the company-visible candidates.ai_match_score write: pass true
// only for a Recruito (admin) run; a recruiter self-check passes false (report is
// still produced and stored, but the client-facing score is never set).
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID, createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { gatherEvalData } from "@/lib/screening/eval-data";
import { extractMatchScore } from "@/lib/screening/extract-match-score";
import { extractCriticalGaps } from "@/lib/screening/extract-critical-gaps";
import { fillEvaluationPrompt } from "@/lib/screening/evaluation-prompt";
import { fillClientReportPrompt } from "@/lib/screening/client-report-prompt";

type AdminClient = ReturnType<typeof createAdminClient>;

export type RunEvalResult =
  | { ok: true; reportMarkdown: string; modelVersion: string; matchScore: number | null; criticalGaps: string[] }
  | { ok: false; error: string; status: number };

function cvMimeFromPath(path: string): "application/pdf" | "text/plain" | null {
  const lower = path.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".txt")) return "text/plain";
  return null;
}

export async function runCandidateEvaluation(args: {
  admin: AdminClient;
  mandateId: string;
  candidateId: string;
  actorUserId: string;
  setScore: boolean;
}): Promise<RunEvalResult> {
  const { admin, mandateId, candidateId, actorUserId, setScore } = args;

  const data = await gatherEvalData(admin, mandateId, candidateId);
  if ("error" in data) return { ok: false, error: data.error, status: 404 };

  if (!data.cvPath) return { ok: false, error: "no_cv", status: 422 };
  const mediaType = cvMimeFromPath(data.cvPath);
  if (!mediaType) {
    // DOCX etc. can't be sent as an Anthropic document — fall back to copy flow.
    return { ok: false, error: "unsupported_cv_format", status: 422 };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "AI service not configured", status: 500 };
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const { data: cvBlob, error: dlError } = await admin.storage.from("cvs").download(data.cvPath);
  if (dlError || !cvBlob) return { ok: false, error: "Could not load CV", status: 500 };
  const cvBytes = Buffer.from(await cvBlob.arrayBuffer());
  if (cvBytes.byteLength > 5 * 1024 * 1024) return { ok: false, error: "CV file too large", status: 422 };
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

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model,
    max_tokens: 8000,
    // ponytail: 0 for maximum determinism. NOTE: temperature is accepted on
    // the default Sonnet 4.6 model but 400s on Sonnet 5 / Opus 4.7+ — if
    // ANTHROPIC_MODEL is ever pointed at one of those, remove this field.
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: mediaType, data: base64 },
          } as any,
          // Screening Q&A deliberately NOT sent (client req 2026-07-08): the
          // recruiter answers them after this pre-submission screening runs, so
          // including them made the model flag "screening questions unanswered"
          // as a false gap. The eval is CV-vs-JD only.
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const reportMarkdown = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as any).text)
    .join("")
    .trim();

  if (!reportMarkdown) return { ok: false, error: "Empty AI response", status: 500 };

  // Second pass — separate CLIENT-FACING report (client request 2026-07-11):
  // rewrites the internal report qualitatively (no scores), replacing the old
  // regex-masked view that showed broken "—" sentences to the company. Failure
  // must never sink the evaluation: null falls back to the masked report.
  let clientReportMarkdown: string | null = null;
  try {
    const clientResponse = await anthropic.messages.create({
      model,
      max_tokens: 3000,
      temperature: 0, // same Sonnet 4.6 caveat as above
      messages: [
        {
          role: "user",
          content: fillClientReportPrompt({ jdText: data.jdText, internalReport: reportMarkdown }),
        },
      ],
    });
    clientReportMarkdown = clientResponse.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text)
      .join("")
      .trim() || null;
  } catch (clientReportError) {
    console.error("[run-evaluation] client report generation failed", clientReportError);
  }

  // Store for re-views + audit trail. Failure to store must NOT lose the report:
  // callers surface it from this return value (render-from-response), so a missing
  // candidate_screenings row only costs persisted re-views, not the live result.
  // ponytail: if this logs in prod, the table/migration (047) is the real fix.
  const { error: insertError } = await admin.from("candidate_screenings").insert({
    screening_id: screeningId,
    candidate_id: candidateId,
    mandate_id: mandateId,
    job_id: data.jobId,
    recruiter_user_id: actorUserId,
    report_markdown: reportMarkdown,
    client_report_markdown: clientReportMarkdown,
    model_version: model,
    cv_hash: cvHash,
  });
  if (insertError) console.error("[run-evaluation] store", insertError);

  // Company-visible score: only Recruito (admin) runs set it, only when blank (a
  // re-run never clobbers), AND only when the report row actually persisted — never
  // expose a client-facing score without its backing report. The live report is
  // still returned above, so a failed insert just yields no score (no data drift).
  const matchScore = extractMatchScore(reportMarkdown);
  if (setScore && matchScore !== null && !insertError) {
    const { error: scoreError } = await admin
      .from("candidates")
      .update({ ai_match_score: matchScore })
      .eq("id", candidateId)
      .is("ai_match_score", null);
    if (scoreError) console.error("[run-evaluation] ai_match_score update", { code: scoreError.code, message: scoreError.message });
  }

  return { ok: true, reportMarkdown, modelVersion: model, matchScore, criticalGaps: extractCriticalGaps(reportMarkdown) };
}
