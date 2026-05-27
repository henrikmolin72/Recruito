import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripHtml } from "@/lib/sanitize";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    const isAdmin = profile?.role === "admin";
    if (profile?.role !== "recruiter" && !isAdmin) {
      return NextResponse.json({ error: "Recruiter profile required" }, { status: 403 });
    }

    // Resolve recruiter id for non-admin users (needed for mandate ownership check)
    let recruiterId: string | null = null;
    if (!isAdmin) {
      const { data: recruiter } = await admin.from("recruiters").select("id").eq("user_id", user.id).single();
      if (!recruiter) return NextResponse.json({ error: "Recruiter profile required" }, { status: 403 });
      recruiterId = recruiter.id as string;
    }

    const rateLimit = await consumeRateLimit({
      key: `api:cv-match:user:${user.id}`,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const formData = await request.formData();
    const cvFile = formData.get("cv_file") as File | null;
    const mandateId = formData.get("mandate_id") as string | null;

    if (!cvFile || !mandateId) {
      return NextResponse.json({ error: "Missing cv_file or mandate_id" }, { status: 400 });
    }

    // Server-side file size check (client validation alone is not sufficient)
    if (cvFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "CV file must be at most 5 MB" }, { status: 422 });
    }

    const mime = cvFile.type.toLowerCase();
    if (mime !== "application/pdf" && mime !== "text/plain") {
      return NextResponse.json({ error: "pdf_only" }, { status: 422 });
    }

    // Fetch mandate — non-admins must own the mandate and it must be active (IDOR prevention)
    let mandateQuery = admin
      .from("job_mandates")
      .select("job_id, jobs(title, description, requirements)")
      .eq("id", mandateId);

    if (!isAdmin) {
      mandateQuery = mandateQuery.eq("recruiter_id", recruiterId as string);
    }

    const { data: mandate } = await mandateQuery.single();
    if (!mandate) return NextResponse.json({ error: "Mandate not found" }, { status: 404 });

    const job: any = Array.isArray((mandate as any).jobs) ? (mandate as any).jobs[0] : (mandate as any).jobs;
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const jobDescription = [
      job.title && `Title: ${job.title}`,
      job.description && stripHtml(job.description),
      job.requirements && `Requirements:\n${job.requirements}`,
    ].filter(Boolean).join("\n\n");

    if (!jobDescription.trim()) {
      return NextResponse.json({ error: "Job is missing description" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI service not configured" }, { status: 500 });

    const anthropic = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

    const bytes = await cvFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Use the actual MIME type so Claude receives correct document metadata
    const mediaMime = mime === "text/plain" ? "text/plain" : "application/pdf";

    const response = await anthropic.messages.create({
      model,
      max_tokens: 500,
      temperature: 0.1,
      system:
        'You are a recruitment assistant. Score how well a CV matches a job and surface concrete improvement hints. ' +
        'Respond ONLY with valid JSON of the form {"score": <integer 0-100>, "hints": ["hint1","hint2","hint3"]}. ' +
        'Each hint must be one short sentence (max ~15 words) suggesting what would strengthen the candidate\'s fit (missing skill, missing evidence, etc.). Return 2–3 hints. No other text.',
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: mediaMime as "application/pdf" | "text/plain", data: base64 },
            } as any,
            {
              type: "text",
              text: `Job description:\n\n${jobDescription}\n\nScore this CV match 0–100 and return 2–3 short improvement hints.`,
            },
          ],
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text)
      .join("");

    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });

    let parsed: { score?: unknown; hints?: unknown };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
    }

    if (typeof parsed.score !== "number") {
      return NextResponse.json({ error: "Invalid score" }, { status: 500 });
    }
    const score = Math.min(100, Math.max(0, Math.round(parsed.score)));
    const hints = Array.isArray(parsed.hints)
      ? parsed.hints
          .filter((h): h is string => typeof h === "string")
          .map((h) => h.trim().slice(0, 200))
          .filter(Boolean)
          .slice(0, 3)
      : [];

    return NextResponse.json({ score, hints });
  } catch (err) {
    console.error("[cv-match]", err);
    return NextResponse.json({ error: "Scoring failed" }, { status: 500 });
  }
}
