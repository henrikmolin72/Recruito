import { describe, it, expect } from "vitest";
import { parseCandidateColumns, getMissingRequiredFields } from "./candidate-form";

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
    fd.set("contact_method", "phone");
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
        expect(cols.contact_method).toBe("phone");
        expect(cols.first_contact_date).toBe("2026-06-01");
        expect(cols.current_salary).toBe(60000);
        expect(cols.screening_answers).toHaveLength(2);
        expect(cols.language_proficiency).toHaveLength(1);
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
});
