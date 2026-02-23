import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bodySchema = z.object({
  applicationId: z.string().uuid(),
});

const screeningSchema = z.object({
  score: z.number().min(0).max(100),
  reasoning: z.array(z.string().min(1)).max(3),
  missingSkills: z.array(z.string()).max(20),
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
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Tomt AI-svar");

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) throw new Error("Kunde inte hitta JSON i AI-svar");
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
    return { userId: user.id, recruiterId: null, isAdmin: true, admin } as const;
  }

  const { data: recruiter } = await admin.from("recruiters").select("id").eq("user_id", user.id).single();

  if (!recruiter) {
    return { error: NextResponse.json({ error: "Recruiter profile required" }, { status: 403 }) } as const;
  }

  return { userId: user.id, recruiterId: recruiter.id as string, isAdmin: false, admin } as const;
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = bodySchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsedBody.error.issues }, { status: 400 });
    }

    const auth = await getAuthenticatedRecruiterContext();
    if ("error" in auth) return auth.error;

    const { applicationId } = parsedBody.data;
    const { admin, recruiterId, isAdmin } = auth;

    const { data: application, error: applicationError } = await admin
      .from("applications")
      .select(`
        id,
        job_id,
        recruiter_id,
        full_name,
        cv_text,
        cover_letter_text,
        job:jobs (
          id,
          title,
          description,
          requirements
        )
      `)
      .eq("id", applicationId)
      .single();

    if (applicationError || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const job = Array.isArray((application as any).job) ? (application as any).job[0] : (application as any).job;
    if (!job) {
      return NextResponse.json({ error: "Job not found for application" }, { status: 404 });
    }

    if (!isAdmin) {
      const { data: mandate } = await admin
        .from("job_mandates")
        .select("id")
        .eq("job_id", application.job_id)
        .eq("recruiter_id", recruiterId)
        .eq("is_active", true)
        .maybeSingle();

      if (!mandate) {
        return NextResponse.json({ error: "No active mandate for this job" }, { status: 403 });
      }

      if ((application as any).recruiter_id && (application as any).recruiter_id !== recruiterId) {
        return NextResponse.json({ error: "Application belongs to another recruiter" }, { status: 403 });
      }
    }

    const cvText = [application.cv_text, application.cover_letter_text].filter(Boolean).join("\n\n");
    const jobDescription = [job.title && `Titel: ${job.title}`, job.description, job.requirements && `Krav:\n${job.requirements}`]
      .filter(Boolean)
      .join("\n\n");

    if (!cvText.trim()) {
      return NextResponse.json({ error: "Application is missing CV text" }, { status: 400 });
    }

    if (!jobDescription.trim()) {
      return NextResponse.json({ error: "Job is missing description" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
    }

    const model = process.env.ANTHROPIC_MODEL || "claude-4-6-sonnet";
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model,
      max_tokens: 900,
      temperature: 0.2,
      // Prompt caching enabled on the stable job description block.
      betas: ["prompt-caching-2024-07-31"],
      system:
        "Du är en rekryteringsassistent. Returnera endast giltig JSON utan markdown. Var konsekvent och saklig.",
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
                `Kandidat (CV + ev. personligt brev) för screening:\n${cvText}\n\n` +
                `Returnera JSON exakt med formatet:\n` +
                `{"score": number(0-100), "reasoning": ["max 3 korta punkter"], "missingSkills": ["skill1","skill2"]}`,
            },
          ],
        },
      ],
    } as any);

    const rawText = extractTextContent((response as any).content);
    const rawJson = extractJsonObject(rawText);
    const screening = screeningSchema.parse(rawJson);

    const normalizedReasoning = screening.reasoning.slice(0, 3);
    const normalizedMissingSkills = screening.missingSkills
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 15);

    const persistedAnalysis = {
      score: screening.score,
      reasoning: normalizedReasoning,
      missingSkills: normalizedMissingSkills,
      applicationName: application.full_name ?? null,
    };

    const { error: upsertError } = await admin.from("ai_screenings").upsert(
      {
        application_id: application.id,
        job_id: application.job_id,
        provider: "anthropic",
        model,
        status: "completed",
        match_score: screening.score,
        gap_analysis: normalizedMissingSkills.join(", "),
        analysis_json: persistedAnalysis,
        top_3_skills: [],
        interview_questions: [],
        error_message: null,
        screened_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "application_id" }
    );

    if (upsertError) {
      console.error("Failed to upsert ai_screenings:", upsertError);
      return NextResponse.json({ error: "Failed to save screening result" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      applicationId: application.id,
      jobId: application.job_id,
      screening: persistedAnalysis,
    });
  } catch (error) {
    console.error("POST /api/screen failed:", error);
    const message = error instanceof z.ZodError ? "Invalid AI JSON format" : error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
