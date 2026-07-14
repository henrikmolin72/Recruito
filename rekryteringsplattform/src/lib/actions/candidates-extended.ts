"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { verifyCvFileContent } from "@/lib/file-magic";
import {
    normalizeIdentity,
    candidateMatchesIdentity,
    isClientEngagementActiveStatus,
} from "@/lib/candidate-identity";
import {
    fdString as toString,
    parseCandidateColumns,
    getMissingRequiredFields,
} from "@/lib/candidate-form";
import { REFERRAL_BLOCKED_JOB_STATUSES } from "@/lib/mandate-stages";
import { countCandidatesAgainstCap } from "@/lib/candidate-workflow";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { runCandidateEvaluation } from "@/lib/screening/run-evaluation";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

const ALLOWED_CV_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt", "rtf"]);
const ALLOWED_CV_MIME_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/rtf",
    "text/rtf",
]);

// Single, content-validated CV upload path shared by Present and the in-form AI
// screening self-check (CLAUDE.md §6: validate MIME by content, one boundary).
// Returns { cvFilePath: null } when no file was provided (CV is optional on Present).
async function uploadCandidateCv(
    supabase: ServerClient,
    cvFile: FormDataEntryValue | null,
    jobId: string,
    recruiterId: string
): Promise<{ cvFilePath: string | null } | { error: string }> {
    if (!(cvFile instanceof File) || cvFile.size === 0) return { cvFilePath: null };
    if (cvFile.size > 5 * 1024 * 1024) return { error: "CV file must be at most 5 MB." };

    const fileExt = (cvFile.name.split(".").pop() || "").toLowerCase();
    const mimeType = (cvFile.type || "").toLowerCase();
    if (!fileExt || !ALLOWED_CV_EXTENSIONS.has(fileExt)) {
        return { error: "Allowed file types: PDF, DOC, DOCX, TXT, RTF." };
    }
    if (mimeType && !ALLOWED_CV_MIME_TYPES.has(mimeType)) {
        return { error: "Allowed file types: PDF, DOC, DOCX, TXT, RTF." };
    }
    // Validate by content, not just extension/declared MIME (CLAUDE.md §6).
    if (!(await verifyCvFileContent(cvFile, fileExt))) {
        return { error: "Filinnehåll matchar inte filtypen. Ladda upp en giltig CV-fil." };
    }

    const safeName = cvFile.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    const fileName = `${jobId}/${recruiterId}/${Date.now()}-${safeName}`;
    const { error: uploadError, data } = await supabase.storage.from("cvs").upload(fileName, cvFile);
    if (uploadError) {
        console.error("CV Upload Error:", uploadError);
        return { error: "Kunde inte ladda upp CV." };
    }
    return { cvFilePath: data.path };
}

export async function createCandidateExtended(mandateId: string, formData: FormData) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // --- Auth & mandate ---
    const { data: mandate } = await supabase
        .from("job_mandates")
        .select("job_id, recruiter_id")
        .eq("id", mandateId)
        .single();

    if (!mandate) return { error: "Mandate not found." };

    const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!recruiter || recruiter.id !== mandate.recruiter_id) {
        return { error: "Unauthorized." };
    }

    // --- Basic required fields ---
    const firstName = toString(formData.get("first_name")).trim();
    const lastName = toString(formData.get("last_name")).trim();
    const email = toString(formData.get("email")).trim();

    if (!firstName || !lastName || !email) {
        return { error: "First name, last name, and email are required." };
    }

    // --- Required presentation fields (server-authoritative; mirrors the client) ---
    // These guarantee the company always receives real candidate data instead of
    // rows of "Not specified". Screening answers are required only when the job
    // actually defines questions.
    const { data: jobForValidation } = await supabase
        .from("jobs")
        .select("screening_questions, status, max_candidates")
        .eq("id", mandate.job_id)
        .single();
    // A paused or company-ended (closed/filled/cancelled) job no longer accepts
    // NEW candidates, even from a recruiter who still holds an active mandate row.
    // Mirrors the disabled "Refer a Candidate" UI gate; enforced here as the
    // server boundary so a paused job can never receive a referral on any path.
    if (REFERRAL_BLOCKED_JOB_STATUSES.has((jobForValidation as any)?.status)) {
        return { error: "This job is not currently accepting candidates." };
    }

    // Candidate-cap gate: a job accepts at most max_candidates candidates in active
    // slots. Drafts never count, and a rejected/withdrawn candidate frees its slot
    // (countCandidatesAgainstCap) — the SAME predicate the admin "X / cap" badge
    // uses, so the enforced limit and the displayed count can never drift. Counted
    // job-wide via the admin client so RLS can't undercount another recruiter's rows.
    // ponytail: app-level check-then-insert; a rare concurrent double-submit at the
    // boundary could still slip one past. Tighten with a DB BEFORE INSERT trigger if
    // that ever shows up in practice — sequential over-submission is what was broken.
    const maxCandidates = (jobForValidation as any)?.max_candidates ?? 8;
    const { data: capRows } = await admin
        .from("candidates")
        .select("status")
        .eq("job_id", mandate.job_id);
    if (countCandidatesAgainstCap((capRows || []).map((c: any) => c.status)) >= maxCandidates) {
        return { error: "This job has reached its candidate limit and is no longer accepting submissions." };
    }
    const screeningCount = Array.isArray((jobForValidation as any)?.screening_questions)
        ? (jobForValidation as any).screening_questions.length
        : 0;
    if (getMissingRequiredFields(formData, screeningCount).length > 0) {
        return {
            error:
                "Please complete all required fields before presenting the candidate: " +
                "employment status & reason, current and expected salary, notice period, " +
                "date and method of first contact, and every screening answer.",
        };
    }

    const normalizedEmail = normalizeIdentity(email);
    const normalizedLinkedIn = normalizeIdentity(toString(formData.get("linkedin_url")));

    // --- Duplicate detection ---
    let initialStatus = "reviewing";

    if (normalizedEmail || normalizedLinkedIn) {
        const { data: jobRow } = await admin
            .from("jobs")
            .select("id, company_id")
            .eq("id", mandate.job_id)
            .single();
        const companyId = (jobRow as any)?.company_id as string | undefined;

        const { data: sameJobCandidates } = await admin
            .from("candidates")
            .select("id, email, linkedin_url, status")
            .eq("job_id", mandate.job_id);

        const duplicate = (sameJobCandidates || []).some((c: any) =>
            c.status !== "draft" &&
            candidateMatchesIdentity(c, normalizedEmail, normalizedLinkedIn)
        );

        if (duplicate) {
            return { error: "A candidate with this email or LinkedIn URL has already been presented for this job." };
        } else if (companyId) {
            const { data: companyJobs } = await admin.from("jobs").select("id").eq("company_id", companyId);
            const companyJobIds = (companyJobs || []).map((j: any) => j.id);

            if (companyJobIds.length > 0) {
                const { data: companyCandidates } = await admin
                    .from("candidates")
                    .select("id, job_id, email, linkedin_url, status")
                    .in("job_id", companyJobIds);

                const clientEngaged = (companyCandidates || []).some(
                    (c: any) =>
                        c.job_id !== mandate.job_id &&
                        candidateMatchesIdentity(c, normalizedEmail, normalizedLinkedIn) &&
                        isClientEngagementActiveStatus(c.status)
                );
                if (clientEngaged) initialStatus = "client_already_engaged";
            }
        }
    }

    // --- CV Upload (shared, content-validated path) ---
    const cvUpload = await uploadCandidateCv(supabase, formData.get("cv_file"), mandate.job_id, recruiter.id);
    if ("error" in cvUpload) return { error: cvUpload.error };
    const cvFilePath = cvUpload.cvFilePath;

    // --- Insert candidate ---
    // Structured fields are parsed once in candidate-form.ts, shared with the
    // draft path, so a resumed draft persists exactly what a direct present does.
    const { data: inserted, error: insertError } = await supabase.from("candidates").insert({
        job_id: mandate.job_id,
        recruiter_id: recruiter.id,
        mandate_id: mandateId,
        first_name: firstName,
        last_name: lastName,
        email,
        cv_file_path: cvFilePath,
        status: initialStatus,
        status_changed_at: new Date().toISOString(),
        recruiter_declaration: true,
        ...parseCandidateColumns(formData),
    }).select("id").single();

    if (insertError) {
        console.error("Candidate Insert Error:", insertError);
        return { error: "Något gick fel. Försök igen." };
    }

    // No client-facing notification at creation: the candidate is in internal
    // review and invisible to the client until Recruito approval
    // (markCandidateRecruitoScreened) fires the "presented" notification.

    // Auto-run the Recruito AI evaluation at SUBMISSION (not approval) so the admin
    // screening queue shows the match score + full report BEFORE deciding whether to
    // submit the candidate to the client. setScore=true: this is Recruito's own run.
    // Non-blocking (after()) so the recruiter's submit returns immediately; the score
    // lands a few seconds later. Best-effort — a missing/DOCX CV just yields no score.
    // The approval-time run in markCandidateRecruitoScreened stays as an idempotent
    // fallback (its `is null` guard means it no-ops once this has set the score).
    if (inserted?.id) {
        after(async () => {
            try {
                const res = await runCandidateEvaluation({
                    admin: createAdminClient(),
                    mandateId,
                    candidateId: inserted.id,
                    actorUserId: user.id,
                    setScore: true,
                });
                if (!res.ok) console.warn("[createCandidateExtended auto-eval]", res.error);
            } catch (e) {
                console.error("[createCandidateExtended auto-eval]", e);
            }
        });
    }

    revalidatePath("/recruiter/mandates");
    revalidatePath("/recruiter");
    return { success: true };
  } catch (err: any) {
      // Re-throw Next.js redirect/notFound errors so they propagate correctly
      if (typeof err?.digest === "string" && (err.digest.startsWith("NEXT_REDIRECT") || err.digest.startsWith("NEXT_NOT_FOUND"))) {
          throw err;
      }
      console.error("createCandidateExtended unexpected error:", err);
      return { error: err?.message || "An unexpected error occurred. Please try again." };
  }
}

// Save (or update) a candidate as a draft: status='draft', partial data allowed,
// no validation/duplicate/cap checks, never queued to Recruito or shown to the
// client. Returns the draftId so the form can keep editing the same row.
export async function saveDraftCandidate(mandateId: string, formData: FormData, draftId?: string | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Du måste vara inloggad." };

    const { data: mandate } = await supabase
        .from("job_mandates")
        .select("job_id, recruiter_id")
        .eq("id", mandateId)
        .single();
    if (!mandate) return { error: "Mandate not found." };

    const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id")
        .eq("user_id", user.id)
        .single();
    if (!recruiter || recruiter.id !== mandate.recruiter_id) return { error: "Unauthorized." };

    const admin = createAdminClient();
    // Persist the FULL structured column set (not just text fields) so resuming a
    // draft restores compensation / employment / notice / contact / screening —
    // the data that previously vanished between Save Draft and Present Candidate.
    const fields = {
        first_name: toString(formData.get("first_name")).trim() || "",
        last_name: toString(formData.get("last_name")).trim() || "",
        email: toString(formData.get("email")).trim() || null,
        ...parseCandidateColumns(formData),
    };

    if (draftId) {
        const { data: existing } = await admin
            .from("candidates")
            .select("id, status, recruiter_id")
            .eq("id", draftId)
            .single();
        if (!existing || existing.recruiter_id !== recruiter.id || existing.status !== "draft") {
            return { error: "Utkastet kunde inte hittas." };
        }
        const { error } = await admin.from("candidates").update(fields).eq("id", draftId);
        if (error) {
            console.error("[saveDraftCandidate update]", error);
            return { error: "Kunde inte spara utkast." };
        }
        revalidatePath("/recruiter/mandates");
        return { success: true, draftId };
    }

    const { data: inserted, error } = await admin
        .from("candidates")
        .insert({
            job_id: mandate.job_id,
            recruiter_id: recruiter.id,
            mandate_id: mandateId,
            status: "draft",
            status_changed_at: new Date().toISOString(),
            ...fields,
        })
        .select("id")
        .single();
    if (error) {
        console.error("[saveDraftCandidate insert]", error);
        return { error: "Kunde inte spara utkast." };
    }
    revalidatePath("/recruiter/mandates");
    return { success: true, draftId: inserted.id };
}

// Delete a draft the recruiter owns (only draft rows can be deleted this way).
export async function deleteDraftCandidate(candidateId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Du måste vara inloggad." };

    const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id")
        .eq("user_id", user.id)
        .single();
    if (!recruiter) return { error: "Unauthorized." };

    const admin = createAdminClient();
    const { error } = await admin
        .from("candidates")
        .delete()
        .eq("id", candidateId)
        .eq("recruiter_id", recruiter.id)
        .eq("status", "draft");
    if (error) {
        console.error("[deleteDraftCandidate]", error);
        return { error: "Kunde inte ta bort utkast." };
    }
    revalidatePath("/recruiter/mandates");
    revalidatePath("/recruiter/candidates");
    return { success: true };
}

// Recruiter pre-submission AI self-check. Persists the in-progress candidate as a
// draft (incl. CV) so the screening engine can read it, runs the evaluation, and
// returns Score + a few critical gaps for an inline preview. setScore=false — a
// recruiter run NEVER sets the company-visible ai_match_score (only Recruito
// approval does). The draft is promoted to a new row (and deleted) on Present, so
// this report is an ephemeral self-check, not the candidate's official screening.
export async function screenDraftCandidate(
    mandateId: string,
    formData: FormData,
    draftId?: string | null
): Promise<{ error: string } | { draftId: string; matchScore: number | null; criticalGaps: string[] }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Du måste vara inloggad." };

    // Auth + mandate ownership (IDOR).
    const { data: mandate } = await supabase
        .from("job_mandates").select("job_id, recruiter_id").eq("id", mandateId).single();
    if (!mandate) return { error: "Mandate not found." };

    const { data: recruiter } = await supabase
        .from("recruiters").select("id").eq("user_id", user.id).single();
    if (!recruiter || recruiter.id !== mandate.recruiter_id) return { error: "Unauthorized." };

    // Same per-user budget as the on-demand report route (Anthropic cost control).
    const rl = await consumeRateLimit({
        key: `api:screening-report:user:${user.id}`,
        limit: 15,
        windowMs: 10 * 60 * 1000,
    });
    if (!rl.allowed) return { error: "rate_limited" };

    // A CV is required to screen.
    const cvUpload = await uploadCandidateCv(supabase, formData.get("cv_file"), mandate.job_id, recruiter.id);
    if ("error" in cvUpload) return { error: cvUpload.error };
    if (!cvUpload.cvFilePath) return { error: "no_cv" };

    const admin = createAdminClient();
    const fields = {
        first_name: toString(formData.get("first_name")).trim() || "",
        last_name: toString(formData.get("last_name")).trim() || "",
        email: toString(formData.get("email")).trim() || null,
        ...parseCandidateColumns(formData),
        cv_file_path: cvUpload.cvFilePath,
    };

    // Upsert the draft so gatherEvalData() can read CV + answers + job context.
    let id = draftId || null;
    if (id) {
        const { data: existing } = await admin
            .from("candidates").select("id, status, recruiter_id").eq("id", id).single();
        if (!existing || existing.recruiter_id !== recruiter.id || existing.status !== "draft") {
            return { error: "Utkastet kunde inte hittas." };
        }
        const { error } = await admin.from("candidates").update(fields).eq("id", id);
        if (error) { console.error("[screenDraftCandidate update]", error); return { error: "save_failed" }; }
    } else {
        // Bound draft accumulation: this action is directly callable and each
        // no-draftId call inserts a row + uploads a CV. Generous cap — legit use
        // reuses one draft via draftId; this only stops runaway/abusive creation.
        const { count } = await admin
            .from("candidates")
            .select("id", { count: "exact", head: true })
            .eq("recruiter_id", recruiter.id)
            .eq("mandate_id", mandateId)
            .eq("status", "draft");
        if ((count ?? 0) >= 25) return { error: "too_many_drafts" };

        const { data: inserted, error } = await admin
            .from("candidates")
            .insert({
                job_id: mandate.job_id,
                recruiter_id: recruiter.id,
                mandate_id: mandateId,
                status: "draft",
                status_changed_at: new Date().toISOString(),
                ...fields,
            })
            .select("id").single();
        if (error || !inserted) { console.error("[screenDraftCandidate insert]", error); return { error: "save_failed" }; }
        id = inserted.id as string;
    }

    const result = await runCandidateEvaluation({
        admin, mandateId, candidateId: id, actorUserId: user.id, setScore: false,
    });
    if (!result.ok) {
        // Surface only safe, actionable codes; mask internal failures (§6).
        const known =
            result.error === "no_cv" ||
            result.error === "unsupported_cv_format" ||
            result.error === "ai_unavailable";
        return { error: known ? result.error : "screening_failed" };
    }

    revalidatePath("/recruiter/mandates");
    return { draftId: id, matchScore: result.matchScore, criticalGaps: result.criticalGaps };
  } catch (err) {
    // Mirror createCandidateExtended: any unexpected throw (e.g. the Anthropic
    // call) returns the masked code, never a raw error to the client (§6).
    console.error("[screenDraftCandidate] unexpected", err);
    return { error: "screening_failed" };
  }
}
