"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
        .select("screening_questions")
        .eq("id", mandate.job_id)
        .single();
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

    // --- CV Upload ---
    const ALLOWED_CV_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt", "rtf"]);
    const ALLOWED_CV_MIME_TYPES = new Set([
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "application/rtf",
        "text/rtf",
    ]);

    let cvFilePath = null;
    const cvFile = formData.get("cv_file");
    if (cvFile instanceof File && cvFile.size > 0) {
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
        const fileName = `${mandate.job_id}/${recruiter.id}/${Date.now()}-${safeName}`;
        const { error: uploadError, data } = await supabase.storage.from("cvs").upload(fileName, cvFile);
        if (uploadError) {
            console.error("CV Upload Error:", uploadError);
            return { error: "Kunde inte ladda upp CV." };
        }
        cvFilePath = data.path;
    }

    // --- Insert candidate ---
    // Structured fields are parsed once in candidate-form.ts, shared with the
    // draft path, so a resumed draft persists exactly what a direct present does.
    const { error: insertError } = await supabase.from("candidates").insert({
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
    });

    if (insertError) {
        console.error("Candidate Insert Error:", insertError);
        return { error: "Något gick fel. Försök igen." };
    }

    // No client-facing notification at creation: the candidate is in internal
    // review and invisible to the client until Recruito approval
    // (markCandidateRecruitoScreened) fires the "presented" notification.

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
    return { success: true };
}
