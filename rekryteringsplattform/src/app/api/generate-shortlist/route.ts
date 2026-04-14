import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { stripHtml } from "@/lib/sanitize";

export const runtime = "nodejs";

const bodySchema = z.object({
  jobId: z.string().uuid(),
});

const shortlistSchema = z.object({
  title: z.string().optional(),
  items: z
    .array(
      z.object({
        rank: z.number().int().min(1).max(10),
        candidateName: z.string(),
        score: z.number().min(0).max(100).optional(),
        pitch: z.string(),
      })
    )
    .min(1)
    .max(10),
  shareText: z.string().optional(),
});

function extractTextContent(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .filter((block: any) => block?.type === "text" && typeof block?.text === "string")
    .map((block: any) => block.text)
    .join("\n")
    .trim();
}

function extractJsonObject(text: string): unknown {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() ?? text.trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) throw new Error("Kunde inte läsa shortlist-JSON");
    return JSON.parse(objectMatch[0]);
  }
}

async function getAuthenticatedRecruiterContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) } as const;
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "admin") {
    return { admin, userId: user.id, recruiterId: null as string | null, isAdmin: true } as const;
  }

  const { data: recruiter } = await admin.from("recruiters").select("id").eq("user_id", user.id).single();
  if (!recruiter) {
    return { error: NextResponse.json({ error: "Recruiter profile required" }, { status: 403 }) } as const;
  }

  return { admin, userId: user.id, recruiterId: recruiter.id as string, isAdmin: false } as const;
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = bodySchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsedBody.error.issues }, { status: 400 });
    }

    const auth = await getAuthenticatedRecruiterContext();
    if ("error" in auth) return auth.error;
    const { admin, recruiterId, isAdmin, userId } = auth;
    const { jobId } = parsedBody.data;

    const rateLimit = consumeRateLimit({
      key: `api:shortlist:user:${userId}`,
      limit: 8,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded for shortlist generation. Try again shortly.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    if (!isAdmin) {
      const { data: mandate } = await admin
        .from("job_mandates")
        .select("id")
        .eq("job_id", jobId)
        .eq("recruiter_id", recruiterId)
        .eq("is_active", true)
        .maybeSingle();
      if (!mandate) {
        return NextResponse.json({ error: "No active mandate for this job" }, { status: 403 });
      }
    }

    const { data: jobRow } = await admin
      .from("jobs")
      .select("id, title, description, requirements")
      .eq("id", jobId)
      .single();

    if (!jobRow) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const { data: rows, error: rowsError } = await admin
      .from("ai_screenings")
      .select(`
        id,
        application_id,
        match_score,
        analysis_json,
        application:applications (
          id,
          recruiter_id,
          full_name,
          email
        )
      `)
      .eq("job_id", jobId)
      .eq("status", "completed")
      .order("match_score", { ascending: false });

    if (rowsError) {
      console.error("Failed to fetch ai screenings for shortlist:", rowsError);
      return NextResponse.json({ error: "Failed to load screenings" }, { status: 500 });
    }

    const normalizedCandidates = (rows || [])
      .map((row: any) => {
        const app = Array.isArray(row.application) ? row.application[0] : row.application;
        const analysis = typeof row.analysis_json === "string" ? safeJson(row.analysis_json) : row.analysis_json || {};
        return {
          applicationId: row.application_id,
          recruiterId: app?.recruiter_id ?? null,
          candidateName: app?.full_name || "Okänd kandidat",
          score: typeof row.match_score === "number" ? row.match_score : Number(row.match_score || 0),
          reasoning: Array.isArray(analysis?.reasoning) ? analysis.reasoning : [],
          missingSkills: Array.isArray(analysis?.missingSkills) ? analysis.missingSkills : [],
        };
      })
      .filter((item) => isAdmin || item.recruiterId === recruiterId)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (normalizedCandidates.length === 0) {
      return NextResponse.json({ error: "No screened candidates found for this job" }, { status: 404 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service is not configured" }, { status: 500 });
    }

    const model = process.env.ANTHROPIC_MODEL || "claude-4-6-sonnet";
    const anthropic = new Anthropic({ apiKey });

    const jobDescription = [jobRow.title && `Titel: ${jobRow.title}`, jobRow.description && stripHtml(jobRow.description), jobRow.requirements && `Krav:\n${jobRow.requirements}`]
      .filter(Boolean)
      .join("\n\n");

    const candidateSummaryText = normalizedCandidates
      .map((candidate, index) => {
        const reasoning = candidate.reasoning.length ? candidate.reasoning.map((r: string) => `- ${r}`).join("\n") : "- Ingen motivering sparad";
        const missing = candidate.missingSkills.length ? candidate.missingSkills.join(", ") : "Inga tydliga gap angivna";
        return [
          `${index + 1}. ${candidate.candidateName}`,
          `Score: ${candidate.score}`,
          `Reasoning:\n${reasoning}`,
          `Missing skills: ${missing}`,
        ].join("\n");
      })
      .join("\n\n");

    const response = await anthropic.messages.create({
      model,
      max_tokens: 1400,
      temperature: 0.2,
      betas: ["prompt-caching-2024-07-31"],
      system:
        "Du hjälper en rekryterare att skapa en kundvänlig shortlist. Returnera endast giltig JSON utan markdown.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Jobbannons / kravprofil:\n${jobDescription}`,
              cache_control: { type: "ephemeral" },
            } as any,
            {
              type: "text",
              text:
                `Här är 10 toppkandidater (eller färre) med score + motivering.\n${candidateSummaryText}\n\n` +
                `Välj ut de 5 bästa (eller färre om underlag saknas) och returnera JSON:\n` +
                `{"title":"...", "items":[{"rank":1,"candidateName":"...","score":88,"pitch":"kort pitch"}], "shareText":"färdig text att skicka till kund"}`,
            },
          ],
        },
      ],
    } as any);

    const rawText = extractTextContent((response as any).content);
    const parsed = shortlistSchema.parse(extractJsonObject(rawText));

    const items = parsed.items
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5);

    const shareText =
      parsed.shareText?.trim() ||
      [
        parsed.title || `Toppkandidater för ${jobRow.title}`,
        "",
        ...items.map((item) => `${item.rank}. ${item.candidateName}${item.score != null ? ` (${item.score}/100)` : ""}\n${item.pitch}`),
      ].join("\n\n");

    return NextResponse.json({
      ok: true,
      jobId,
      title: parsed.title || `Topp-5 presentation för ${jobRow.title}`,
      items,
      shareText,
    });
  } catch (error) {
    console.error("POST /api/generate-shortlist failed:", error);
    const status = error instanceof z.ZodError ? 400 : 500;
    const message = error instanceof z.ZodError ? "Invalid request payload" : "Shortlist could not be generated. Please try again.";
    return NextResponse.json({ error: message }, { status });
  }
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
