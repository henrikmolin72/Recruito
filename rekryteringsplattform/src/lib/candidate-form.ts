// Shared, pure helpers for the recruiter candidate-presentation form.
//
// This module is intentionally NOT "use server": it is imported by both the
// server action (`candidates-extended.ts`) and the client form
// (`candidate-submission-form.tsx`) so the two can never drift. Drift is
// exactly what caused the draft data-loss bug — drafts persisted a different
// (smaller) set of columns than the final submit, so resuming a draft and
// presenting silently shipped a candidate with empty Compensation / Employment
// / Screening data to the company.

export function fdString(value: FormDataEntryValue | null): string {
    return typeof value === "string" ? value : "";
}

export function fdOptionalInt(value: FormDataEntryValue | null): number | null {
    const raw = fdString(value).trim();
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

function parseJsonArray(value: FormDataEntryValue | null): any[] {
    const raw = fdString(value);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Maps the presentation form's FormData to the candidate table's structured
 * columns. Identity (first/last/email), job/recruiter wiring, CV, and status
 * are handled by the caller — everything else lives here so create + draft
 * stay in lockstep.
 */
export function parseCandidateColumns(formData: FormData): Record<string, any> {
    const currentSalary = fdOptionalInt(formData.get("current_salary"));
    const expectedSalary = fdOptionalInt(formData.get("expected_salary"));

    // The "expected below current" reason is only meaningful when expected <
    // current. Drop it otherwise so it can't be set out-of-band by a crafted POST.
    const expectedBelowCurrent =
        currentSalary !== null && expectedSalary !== null && expectedSalary < currentSalary;

    const screeningAnswers = parseJsonArray(formData.get("screening_answers"));
    const languageProficiency = parseJsonArray(formData.get("language_proficiency"));

    return {
        phone: fdString(formData.get("phone")) || null,
        linkedin_url: fdString(formData.get("linkedin_url")) || null,
        current_title: fdString(formData.get("current_title")) || null,
        current_company: fdString(formData.get("current_company")) || null,
        years_experience: fdOptionalInt(formData.get("years_experience")),
        cover_note: fdString(formData.get("cover_note")) || null,
        location_city: fdString(formData.get("location_city")) || null,
        location_country: fdString(formData.get("location_country")) || null,
        location_status: fdString(formData.get("location_status")) || null,
        portfolio_url: fdString(formData.get("portfolio_url")) || null,
        work_authorization: fdString(formData.get("work_authorization")) || null,
        // ai_match_score is the company-visible AI verdict and is set ONLY by
        // Recruito (admin) running the evaluation — never by a recruiter's form
        // submission. See /api/screening-report (admin-gated write).
        employment_status: fdString(formData.get("employment_status")) || null,
        employment_status_reason: fdString(formData.get("employment_reason")) || null,
        other_processes: fdString(formData.get("other_processes")) === "yes",
        other_processes_stage: fdString(formData.get("other_processes_stage")) || null,
        current_salary: currentSalary,
        current_salary_currency: fdString(formData.get("current_salary_currency")) || "EUR",
        current_benefits: fdString(formData.get("current_benefits")) || null,
        // Both columns are written from the same "expected" input (legacy: the
        // company view reads desired_salary, older code reads expected_salary).
        expected_salary: expectedSalary,
        desired_salary: expectedSalary,
        desired_salary_currency: fdString(formData.get("desired_salary_currency")) || "EUR",
        desired_benefits: fdString(formData.get("desired_benefits")) || null,
        expected_salary_below_current_reason: expectedBelowCurrent
            ? fdString(formData.get("expected_salary_below_current_reason")) || null
            : null,
        notice_period: fdString(formData.get("notice_period")) || null,
        notice_negotiable: fdString(formData.get("notice_negotiable")) === "yes",
        first_contact_date: fdString(formData.get("first_contact_date")) || null,
        contact_method: fdString(formData.get("contact_method")) || null,
        screening_answers: screeningAnswers.length > 0 ? screeningAnswers : null,
        language_proficiency: languageProficiency.length > 0 ? languageProficiency : null,
    };
}

// Returns true when at least one of the fields that are *displayed* in the
// "Compensation & Availability" section has a value. Fields like
// current_benefits/desired_benefits are intentionally excluded: they are not
// rendered in that section, so including them caused the section to appear
// with every visible field showing "Not specified" for legacy candidates.
export function hasCandidateCompensationData(candidate: {
    current_salary?: number | null;
    desired_salary?: number | null;
    notice_period?: string | null;
    first_contact_date?: string | null;
    contact_method?: string | null;
}): boolean {
    return !!(
        candidate.current_salary ||
        candidate.desired_salary ||
        candidate.notice_period ||
        candidate.first_contact_date ||
        candidate.contact_method
    );
}

// Stable keys returned by getMissingRequiredFields; the client maps these to
// localized labels for the error banner.
export type RequiredFieldKey =
    | "employment_status"
    | "employment_reason"
    | "notice_period"
    | "first_contact_date"
    | "contact_method"
    | "salary"
    | "screening_answers";

/**
 * Returns the required fields a recruiter must complete before presenting a
 * candidate to the company. Used by BOTH the client (fast feedback) and the
 * server action (authoritative — a crafted POST can't bypass it). Pass the
 * number of screening questions the job defines so unanswered questions block
 * submission.
 */
export function getMissingRequiredFields(
    formData: FormData,
    screeningQuestionCount: number,
): RequiredFieldKey[] {
    const missing: RequiredFieldKey[] = [];

    const employmentStatus = fdString(formData.get("employment_status")).trim();
    if (employmentStatus !== "employed" && employmentStatus !== "not_employed") {
        missing.push("employment_status");
    }
    if (!fdString(formData.get("employment_reason")).trim()) {
        missing.push("employment_reason");
    }
    if (!fdString(formData.get("notice_period")).trim()) {
        missing.push("notice_period");
    }
    const firstContact = fdString(formData.get("first_contact_date")).trim();
    // allow up to +1 day: max possible local-vs-UTC skew; repo convention is toISOString for machine-comparable dates
    if (!firstContact || firstContact > new Date(Date.now() + 864e5).toISOString().slice(0, 10)) {
        missing.push("first_contact_date");
    }
    const method = fdString(formData.get("contact_method")).trim();
    if (method !== "in_person" && method !== "video_call") {
        missing.push("contact_method");
    }

    const currentSalary = fdOptionalInt(formData.get("current_salary"));
    const expectedSalary = fdOptionalInt(formData.get("expected_salary"));
    if (currentSalary === null || currentSalary <= 0 || expectedSalary === null || expectedSalary <= 0) {
        missing.push("salary");
    }

    if (screeningQuestionCount > 0) {
        const answers = parseJsonArray(formData.get("screening_answers"));
        const allAnswered =
            answers.length >= screeningQuestionCount &&
            Array.from({ length: screeningQuestionCount }).every(
                (_, i) => !!fdString(answers[i]?.answer ?? "").trim(),
            );
        if (!allAnswered) missing.push("screening_answers");
    }

    return missing;
}

export type SalaryExpectationLevel = "within" | "above" | "above_10pct";

/**
 * Compares the candidate's expected salary with the client's maximum salary
 * (client ask 2026-09-04). Returns null when no comparison is possible —
 * missing values, or different currencies (we never convert FX). "above" = over
 * the max but within +10% (accepted, with a note); "above_10pct" = more than
 * 10% over (advisory warning; submission is NOT blocked).
 */
export function salaryExpectationLevel(
    expected: number | null | undefined,
    expectedCurrency: string | null | undefined,
    jobMax: number | null | undefined,
    jobCurrency: string | null | undefined,
): SalaryExpectationLevel | null {
    if (expected == null || jobMax == null || !(expected > 0) || !(jobMax > 0)) return null;
    if (!expectedCurrency || !jobCurrency || expectedCurrency !== jobCurrency) return null;
    // Integer arithmetic keeps exactly +10% on the "allowed" side (no float drift).
    if (expected <= jobMax) return "within";
    return expected * 10 <= jobMax * 11 ? "above" : "above_10pct";
}
