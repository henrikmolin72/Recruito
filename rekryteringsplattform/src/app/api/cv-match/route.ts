import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripHtml } from "@/lib/sanitize";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "recruiter" && profile?.role !== "admin") {
      return NextResponse.json({ error: "Recruiter profile required" }, { status: 403 });
    }

    const rateLimit = consumeRateLimit({
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

    const mime = cvFile.type.toLowerCase();
    const supported = mime === "application/pdf" || mime === "text/plain";
    if (!supported) {
      return NextResponse.json({ error: "pdf_only" }, { status: 422 });
    }

    const { data: mandate } = await admin
      .from("job_mandates")
      .select("job_id, jobs(title, description, requirements)")
      .eq("id", mandateId)
      .single();

    if (!mandate) return NextResponse.json({ error: "Mandate not found" }, { status: 404 });

    const job: any = Array.isArray((mandate as any).jobs) ? (mandate as any).jobs[0] : (mandate as any).jobs;
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const jobDescription = [
      job.title && `Title: ${job.title}`,
      job.description && stripHtml(job.description),
      job.requirements && `Requirements:\n${job.requirements}`,
    ].filter(Boolean).join("\n\n");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI service not configured" }, { status: 500 });

    const anthropic = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250514";

    const bytes = await cvFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const response = await anthropic.messages.create({
      model,
      max_tokens: 300,
      temperature: 0.1,
      system: 'You are a recruitment assistant. Score how well a CV matches a job. Respond ONLY with valid JSON: {"score": <integer 0-100>}. No other text.',
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            } as any,
            {
              type: "text",
              text: `Job description:\n\n${jobDescription}\n\nScore this CV match 0–100.`,
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

    const { score } = JSON.parse(match[0]);
    if (typeof score !== "number") return NextResponse.json({ error: "Invalid score" }, { status: 500 });

    return NextResponse.json({ score: Math.min(100, Math.max(0, Math.round(score))) });
  } catch (err) {
    console.error("[cv-match]", err);
    return NextResponse.json({ error: "Scoring failed" }, { status: 500 });
  }
}
