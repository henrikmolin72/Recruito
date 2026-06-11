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

function toString(value: FormDataEntryValue | null) {
    return typeof value === "string" ? value : "";
}

function toOptionalInt(value: FormDataEntryValue | null) {
    const raw = toString(value).trim();
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
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

    // --- Parse extended fields ---
    const aiScore = toOptionalInt(formData.get("ai_match_score"));
    const firstContactDate = toString(formData.get("first_contact_date")) || null;

    let screeningAnswers: any[] = [];
    try {
        const raw = toString(formData.get("screening_answers"));
        if (raw) screeningAnswers = JSON.parse(raw);
    } catch { }

    let languageProficiency: any[] = [];
    try {
        const raw = toString(formData.get("language_proficiency"));
        if (raw) languageProficiency = JSON.parse(raw);
    } catch { }

    const otherProcessesRaw = toString(formData.get("other_processes"));

    // The "below current" reason is only meaningful when expected < current.
    // Drop it otherwise so the field can't be set out-of-band by a hand-crafted POST.
    const currentSalaryParsed = toOptionalInt(formData.get("current_salary"));
    const expectedSalaryParsed = toOptionalInt(formData.get("expected_salary"));
    const expectedBelowCurrent =
        currentSalaryParsed !== null &&
        expectedSalaryParsed !== null &&
        expectedSalaryParsed < currentSalaryParsed;
    const expectedBelowCurrentReason = expectedBelowCurrent
        ? toString(formData.get("expected_salary_below_current_reason")) || null
        : null;

    // --- Insert candidate ---
    const { error: insertError } = await supabase.from("candidates").insert({
        job_id: mandate.job_id,
        recruiter_id: recruiter.id,
        mandate_id: mandateId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: toString(formData.get("phone")) || null,
        linkedin_url: toString(formData.get("linkedin_url")) || null,
        current_title: toString(formData.get("current_title")) || null,
        current_company: toString(formData.get("current_company")) || null,
        years_experience: toOptionalInt(formData.get("years_experience")),
        expected_salary: expectedSalaryParsed,
        cover_note: toString(formData.get("cover_note")) || null,
        cv_file_path: cvFilePath,
        status: initialStatus,
        status_changed_at: new Date().toISOString(),
        // Extended fields
        location_city: toString(formData.get("location_city")) || null,
        location_country: toString(formData.get("location_country")) || null,
        location_status: toString(formData.get("location_status")) || null,
        portfolio_url: toString(formData.get("portfolio_url")) || null,
        work_authorization: toString(formData.get("work_authorization")) || null,
        ai_match_score: aiScore,
        employment_status: toString(formData.get("employment_status")) || null,
        employment_status_reason: toString(formData.get("employment_reason")) || null,
        other_processes: otherProcessesRaw === "yes",
        other_processes_stage: toString(formData.get("other_processes_stage")) || null,
        current_salary: currentSalaryParsed,
        current_salary_currency: toString(formData.get("current_salary_currency")) || "EUR",
        current_benefits: toString(formData.get("current_benefits")) || null,
        desired_salary: expectedSalaryParsed,
        desired_salary_currency: toString(formData.get("desired_salary_currency")) || "EUR",
        desired_benefits: toString(formData.get("desired_benefits")) || null,
        expected_salary_below_current_reason: expectedBelowCurrentReason,
        notice_period: toString(formData.get("notice_period")) || null,
        notice_negotiable: toString(formData.get("notice_negotiable")) === "yes",
        first_contact_date: firstContactDate || null,
        contact_method: toString(formData.get("contact_method")) || null,
        screening_answers: screeningAnswers.length > 0 ? screeningAnswers : null,
        language_proficiency: languageProficiency.length > 0 ? languageProficiency : null,
        assessment_summary: toString(formData.get("assessment_summary")) || null,
        recruiter_declaration: true,
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
    const fields = {
        first_name: toString(formData.get("first_name")).trim() || "",
        last_name: toString(formData.get("last_name")).trim() || "",
        email: toString(formData.get("email")).trim() || null,
        phone: toString(formData.get("phone")).trim() || null,
        linkedin_url: toString(formData.get("linkedin_url")).trim() || null,
        current_title: toString(formData.get("current_title")).trim() || null,
        current_company: toString(formData.get("current_company")).trim() || null,
        cover_note: toString(formData.get("cover_note")).trim() || null,
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
