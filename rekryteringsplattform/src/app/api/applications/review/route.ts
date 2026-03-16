import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { reviewApplication } from "@/lib/actions/applications";

const reviewBodySchema = z.object({
  applicationId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the recruiter ID for this user
  const { data: recruiter } = await supabase
    .from("recruiters")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!recruiter) {
    return NextResponse.json({ error: "Recruiter not found" }, { status: 403 });
  }

  const parsed = reviewBodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const { applicationId, action } = parsed.data;
  const result = await reviewApplication(applicationId, action, recruiter.id);
  return NextResponse.json(result);
}
