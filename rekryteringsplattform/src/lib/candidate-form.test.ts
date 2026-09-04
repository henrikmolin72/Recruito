import { describe, it, expect } from "vitest";
import { parseCandidateColumns, getMissingRequiredFields, hasCandidateCompensationData, salaryExpectationLevel } from "./candidate-form";

// Builds a FormData representing a fully-completed presentation form.
function fullFormData(): FormData {
    const fd = new FormData();
    fd.set("first_name", "Ali");
    fd.set("last_name", "Rahman");
    fd.set("email", "ali.rahman@email.com");
    fd.set("phone", "+46 70 445 2211");
    fd.set("location_city", "Stockholm");
    fd.set("location_country", "Sweden");
    fd.set("location_status", "on_site");
    fd.set("work_authorization", "eu_citizen");
    fd.set("employment_status", "employed");
    fd.set("employment_reason", "Career growth");
    fd.set("other_processes", "yes");
    fd.set("other_processes_stage", "interview");
    fd.set("current_salary", "60000");
    fd.set("current_salary_currency", "SEK");
    fd.set("expected_salary", "70000");
    fd.set("desired_salary_currency", "SEK");
    fd.set("notice_period", "1_month");
    fd.set("notice_negotiable", "yes");
    fd.set("first_contact_date", "2026-06-01");
    fd.set("contact_method", "video_call");
    fd.set("screening_answers", JSON.stringify([
        { question: "Q1", answer: "yes, 3 years" },
        { question: "Q2", answer: "BSc EE" },
    ]));
    fd.set("language_proficiency", JSON.stringify([{ language: "Swedish", proficiency: "native" }]));
    fd.set("cover_note", "Strong candidate.");
    return fd;
}

describe("parseCandidateColumns", () => {
    it("emits the structured columns that drafts used to drop (the bug)", () => {
        const cols = parseCandidateColumns(fullFormData());
        // These are precisely the fields the company view showed as 'Not specified'
        // when a draft was resumed — they must survive the parse.
        expect(cols.employment_status).toBe("employed");
        expect(cols.employment_status_reason).toBe("Career growth");
        expect(cols.notice_period).toBe("1_month");
        expect(cols.notice_negotiable).toBe(true);
        expect(cols.contact_method).toBe("video_call");
        expect(cols.first_contact_date).toBe("2026-06-01");
        expect(cols.current_salary).toBe(60000);
        expect(cols.screening_answers).toHaveLength(2);
        expect(cols.language_proficiency).toHaveLength(1);
    });

    it("never sets ai_match_score from the form — that score is Recruito-owned (A1)", () => {
        // Even if a crafted submission includes ai_match_score, the parser must not
        // carry it through: the company-visible AI verdict is set only by Recruito
        // running the evaluation, never by a recruiter's submission.
        const fd = fullFormData();
        fd.set("ai_match_score", "95");
        expect(parseCandidateColumns(fd).ai_match_score).toBeUndefined();
    });

    it("maps the single 'expected' input to BOTH desired_salary and expected_salary", () => {
        const cols = parseCandidateColumns(fullFormData());
        expect(cols.expected_salary).toBe(70000);
        expect(cols.desired_salary).toBe(70000);
    });

    it("maps other_processes yes/no to a boolean", () => {
        expect(parseCandidateColumns(fullFormData()).other_processes).toBe(true);
        const fd = fullFormData();
        fd.set("other_processes", "no");
        expect(parseCandidateColumns(fd).other_processes).toBe(false);
    });

    it("drops the below-current reason unless expected < current", () => {
        const fd = fullFormData();
        fd.set("expected_salary_below_current_reason", "Relocating");
        // expected (70000) > current (60000) → reason dropped
        expect(parseCandidateColumns(fd).expected_salary_below_current_reason).toBeNull();
        fd.set("expected_salary", "50000"); // now below current → kept
        expect(parseCandidateColumns(fd).expected_salary_below_current_reason).toBe("Relocating");
    });

    it("returns nulls for a blank (draft-in-progress) form without throwing", () => {
        const cols = parseCandidateColumns(new FormData());
        expect(cols.employment_status).toBeNull();
        expect(cols.notice_period).toBeNull();
        expect(cols.screening_answers).toBeNull();
        expect(cols.current_salary_currency).toBe("EUR");
    });
});

describe("getMissingRequiredFields", () => {
    it("passes when every required field is present", () => {
        expect(getMissingRequiredFields(fullFormData(), 2)).toEqual([]);
    });

    it("flags every required field on an empty form", () => {
        const missing = getMissingRequiredFields(new FormData(), 2);
        expect(missing).toEqual(
            expect.arrayContaining([
                "employment_status",
                "employment_reason",
                "notice_period",
                "first_contact_date",
                "contact_method",
                "salary",
                "screening_answers",
            ]),
        );
    });

    it("flags salary when either value is missing or non-positive", () => {
        const fd = fullFormData();
        fd.set("expected_salary", "0");
        expect(getMissingRequiredFields(fd, 2)).toContain("salary");
        fd.delete("current_salary");
        expect(getMissingRequiredFields(fd, 2)).toContain("salary");
    });

    it("flags screening only when a question is left unanswered", () => {
        const fd = fullFormData();
        expect(getMissingRequiredFields(fd, 2)).not.toContain("screening_answers");
        fd.set("screening_answers", JSON.stringify([{ question: "Q1", answer: "yes" }, { question: "Q2", answer: "" }]));
        expect(getMissingRequiredFields(fd, 2)).toContain("screening_answers");
    });

    it("ignores screening when the job has no questions", () => {
        const fd = fullFormData();
        fd.delete("screening_answers");
        expect(getMissingRequiredFields(fd, 0)).not.toContain("screening_answers");
    });

    it("rejects a future first_contact_date as missing", () => {
        const fd = fullFormData();
        fd.set("first_contact_date", "2099-01-01");
        expect(getMissingRequiredFields(fd, 0)).toContain("first_contact_date");
    });

    it("accepts today's first_contact_date", () => {
        const fd = fullFormData();
        fd.set("first_contact_date", new Date().toISOString().slice(0, 10));
        expect(getMissingRequiredFields(fd, 0)).not.toContain("first_contact_date");
    });

    it("rejects a stale contact_method value no longer offered", () => {
        const fd = fullFormData();
        fd.set("contact_method", "phone");
        expect(getMissingRequiredFields(fd, 0)).toContain("contact_method");
        fd.set("contact_method", "video_call");
        expect(getMissingRequiredFields(fd, 0)).not.toContain("contact_method");
    });
});

describe("hasCandidateCompensationData", () => {
    it("returns false when all displayed fields are null", () => {
        expect(hasCandidateCompensationData({
            current_salary: null,
            desired_salary: null,
            notice_period: null,
            first_contact_date: null,
            contact_method: null,
        })).toBe(false);
    });

    it("returns false when only benefits fields are set (legacy candidate bug)", () => {
        // current_benefits/desired_benefits are NOT in the function — this was
        // the bug: they triggered hasCompensation but nothing was displayed.
        expect(hasCandidateCompensationData({})).toBe(false);
    });

    it("returns true when current_salary is set", () => {
        expect(hasCandidateCompensationData({ current_salary: 60000 })).toBe(true);
    });

    it("returns true when any single displayed field is set", () => {
        expect(hasCandidateCompensationData({ notice_period: "1_month" })).toBe(true);
        expect(hasCandidateCompensationData({ desired_salary: 70000 })).toBe(true);
        expect(hasCandidateCompensationData({ first_contact_date: "2026-06-01" })).toBe(true);
        expect(hasCandidateCompensationData({ contact_method: "phone" })).toBe(true);
    });
});

describe("salaryExpectationLevel — candidate expectation vs. the client's max salary", () => {
    it("within: at or below the max", () => {
        expect(salaryExpectationLevel(500_000, "SEK", 500_000, "SEK")).toBe("within");
        expect(salaryExpectationLevel(499_999, "SEK", 500_000, "SEK")).toBe("within");
    });
    it("above: over the max but at most +10% (allowed, with a note)", () => {
        expect(salaryExpectationLevel(500_001, "SEK", 500_000, "SEK")).toBe("above");
        expect(salaryExpectationLevel(550_000, "SEK", 500_000, "SEK")).toBe("above"); // exactly +10%
    });
    it("above_10pct: more than +10% over the max", () => {
        expect(salaryExpectationLevel(550_001, "SEK", 500_000, "SEK")).toBe("above_10pct");
        expect(salaryExpectationLevel(700_000, "SEK", 500_000, "SEK")).toBe("above_10pct");
    });
    it("null when the comparison is impossible (missing values or different currencies)", () => {
        expect(salaryExpectationLevel(550_000, "EUR", 500_000, "SEK")).toBeNull();
        expect(salaryExpectationLevel(550_000, "SEK", null, "SEK")).toBeNull();
        expect(salaryExpectationLevel(null, "SEK", 500_000, "SEK")).toBeNull();
        expect(salaryExpectationLevel(0, "SEK", 500_000, "SEK")).toBeNull();
        expect(salaryExpectationLevel(550_000, "SEK", 500_000, null)).toBeNull();
        expect(salaryExpectationLevel(550_000, "", 500_000, "SEK")).toBeNull();
    });
});
