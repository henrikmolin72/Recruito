// Structured candidate pre-submission evaluation prompt.
//
// The template is the client's final prompt, verbatim, with {PLACEHOLDER}
// tokens. fillEvaluationPrompt() fills it for the server-side Anthropic call
// (run-evaluation.ts). The former Phase-1 copy-to-clipboard flow was removed
// once the server-side eval superseded it.

export type EvalConfig = {
  targetSector: string | null;
  adjacentSectors: string[] | null;
  transferableSkills: string[] | null;
  customKeywords: string[] | null;
};

export type EvalMetadata = {
  screeningId: string;
  modelVersion: string;
  isoTimestamp: string;
  jdId: string;
  cvHash: string;
};

const PROMPT_TEMPLATE = `You are an expert Recruiter and Compliance-Aware Screening Specialist.

ROLE CONTEXT
─────────────────────────────────────────────────────────────────
Target Job Description (JD): {JD_TEXT}
Target Sector: {TARGET_SECTOR}
Adjacent Sectors Accepted: {ADJACENT_SECTORS}
Transferable Skills to Credit: {TRANSFERABLE_SKILLS}
Additional Keywords / Role Expansions: {CUSTOM_KEYWORDS}
─────────────────────────────────────────────────────────────────

SCREENING RULES (read before analysis)
- Score skills and demonstrated competencies — NOT job titles or sector labels alone.
- A candidate from an adjacent sector with matching transferable skills MUST receive
  an Adjusted Match Score in addition to the Direct Match Score.
- Do NOT use, infer, or factor in: gender, age, nationality, ethnicity, photo,
  marital status, or any protected attribute. If CV contains such information, ignore it.
- Flag any JD requirement that may constitute indirect discrimination.
- The JD may list SCREENING QUESTIONS for the recruiter to ask the candidate. Those are
  answered later in the submission process and are NOT part of this evaluation: do not
  evaluate them, and NEVER count unanswered screening questions as a gap or missing element.
- All output must be in English.
- Use red marks 🔴 as specified per field.
- DEAL-BREAKER / HARD REQUIREMENTS CAP: Treat any requirement the JD marks as mandatory / required / "must have" / a stated minimum as a GATE. A candidate who fails a gate is a near-certain client rejection, so gate failures are DEAL-BREAKERS. Gates explicitly include, but are not limited to:
    • a required MINIMUM YEARS OF EXPERIENCE (e.g., "5+ years", "at least 3 years") the CV does not clearly meet — compare against Q4 (professional experience, with internships / part-time excluded);
    • a required DEGREE at a specific level AND field (e.g., a Bachelor's or Master's in a named field) the candidate does not hold — a degree in an unrelated field, or a lower level than required, does NOT satisfy it;
    • a mandatory LANGUAGE PROFICIENCY at a stated level (e.g., fluent / native / C1) not demonstrated in the CV;
    • a required working language, certification, or legally required work authorization.
  If the CV does not clearly demonstrate a gate requirement, the candidate is NOT RECOMMENDED: NEITHER the Direct Match Score NOR the Adjusted Match Score may exceed 49%, the Overall Recommendation (Section E) MUST be DECLINE, and this holds regardless of other strengths or transferable skills. Reduce the score further, proportionally, for each additional unmet gate. A strong adjacent profile may be noted for context but NEVER lifts any score above 49% while a gate is unmet. When unsure whether a requirement is mandatory, JD phrasing such as "required", "must", "minimum", "essential", "fluent", or "native" means mandatory.
─────────────────────────────────────────────────────────────────

Review the CV against the JD above. Return ALL sections below in TABLE FORMAT
unless otherwise specified.

CANDIDATE-DECLARED FACTS (from the recruiter's submission form — not screening Q&A)
- Current employment status: {DECLARED_EMPLOYMENT_STATUS}
- Total years of professional experience: {DECLARED_YEARS_EXPERIENCE}
Treat these as authoritative context for criteria 4 and 5 when the CV is
ambiguous or silent: in that case defer to these facts and do not flag.
Only raise a criteria 4–7 concern when the CV itself clearly evidences it.
If the CV clearly contradicts a declared fact, apply the CV evidence as
normal, note the discrepancy under Section D ambiguities, and set
Human Review Recommended: YES.

══════════════════════════════════════════════════════════════════
SECTION A — CORE SCREENING
══════════════════════════════════════════════════════════════════

1. JD MATCH — DIRECT
   Does the CV meet the JD requirements? (Short reply: Yes / Partial / No)

2. DIRECT MATCH SCORE
   To what extent does the CV match the JD directly?
   (e.g., 50%, 80%, 100%)
   🔴 Red mark if below 80%.

3. KEY GAPS
   What key JD elements are missing from the CV?
   (Short reply. Include approximate % weight of each gap.)
   Output as plain "- " bullets, each naming the missing JD element in words.
   Do NOT number the bullets, and do NOT repeat the numbered criteria titles
   below (years of experience, employment status, short-term positions,
   overqualification) as gap lines — those are reported in their own sections.

4. YEARS OF PROFESSIONAL EXPERIENCE
   Total full-time professional experience in years.
   EXCLUDE: internships, apprenticeships, freelance, part-time, volunteer work.
   (Short reply: X years Y months)

5. CURRENT EMPLOYMENT STATUS
   Is the candidate currently employed? Include:
   - Current employer name and start date
   - Employment type if stated
   🔴 Red mark if: unemployed, in internship, apprenticeship, or freelance-only status.
   (Apply the CANDIDATE-DECLARED FACTS rule above when the CV is ambiguous.)

6. SHORT-TERM POSITIONS
   How many roles in the CV lasted approximately 3–4 months or less?
   List them.
   🔴 Flag if more than 2 such positions exist.

7. OVERQUALIFICATION
   Is the candidate overqualified for this role?
   If yes: estimated % overqualification and reasoning.

══════════════════════════════════════════════════════════════════
SECTION B — SUMMARIES
══════════════════════════════════════════════════════════════════

8. RECRUITER SUMMARY (for Hiring Manager)
   5-line summary of the candidate from the recruiter's perspective,
   aligned with the JD. Exclude language skills. Professional tone.

9. CAREER HISTORY TABLE
   Provide a detailed table with the following columns:

   | # | Job Title | Company | Sector | Start | End | Duration (yrs/mo) | % Relevance to JD | Company Size | Country | Notes |

   - List roles chronologically from earliest to most recent.
   - Insert a row labelled "— GAP —" with duration whenever a gap
     between consecutive roles exceeds 1 month.
   - % Relevance = how relevant this specific role is to the current JD.

10. EDUCATION TABLE

    | Degree / Qualification | Institution | Country | Year | Relevance to JD % | JD Requirement Met? |

══════════════════════════════════════════════════════════════════
SECTION C — ADJACENT SECTOR & TRANSFERABLE SKILLS
══════════════════════════════════════════════════════════════════

11. TRANSFERABLE SKILLS ANALYSIS

    Only complete this section if Direct Match Score (Q2) is below 80%
    OR if candidate comes from an adjacent sector listed in ADJACENT_SECTORS above.

    11a. Adjacent Sector Detection
         Which sector(s) does this candidate's experience primarily come from?
         Does it match any sector in ADJACENT_SECTORS? (Yes / No / Partial)

    11b. Transferable Skills Match
         | Transferable Skill Required | Evidence in CV | Strength (Strong/Moderate/Weak/None) |
         (Use skills from TRANSFERABLE_SKILLS variable above)

    11c. Adjusted Match Score
         Based on transferable skills credited:
         Direct Match Score: X%  →  Adjusted Match Score: Y%
         Reasoning: (2–3 lines explaining what transfers and what gap remains)

    11d. Adjacent Profile Recommendation
         Select one:
         ✅ Strong adjacent profile — recommend human review for advancement
         🟡 Moderate adjacent profile — relevant skills present but gaps remain
         ❌ Weak adjacent profile — insufficient transferable evidence

══════════════════════════════════════════════════════════════════
SECTION D — BIAS AUDIT & COMPLIANCE (EU AI Act)
══════════════════════════════════════════════════════════════════

12. BIAS & COMPLIANCE AUDIT

    | Audit Item | Result | Notes |
    |---|---|---|
    | Protected attributes used in scoring? | YES 🔴 / NO ✅ | List any found |
    | JD contains potentially discriminatory requirements? | YES 🔴 / NO ✅ | Flag specific clause if yes |
    | Screening based on skills + experience only? | YES ✅ / NO 🔴 | |
    | CV contained inferrable protected attributes (e.g. photo, DOB)? | YES / NO | Confirm ignored |
    | Screening confidence level | HIGH / MEDIUM / LOW | Reason if Medium or Low |
    | Ambiguities in CV that affected scoring | List or "None" | |

    Human Review Recommended: YES / NO
    Reason: (one line — required if YES, or if Adjusted Score differs from Direct Score by >15%)

══════════════════════════════════════════════════════════════════
SECTION E — FINAL RECOMMENDATION
══════════════════════════════════════════════════════════════════

13. SCREENING OUTCOME

    | Field | Value |
    |---|---|
    | Direct Match Score | X% |
    | Adjusted Match Score (if applicable) | Y% |
    | Employment Status Flag | ✅ / 🔴 |
    | Short-Term Roles Flag | ✅ / 🔴 |
    | Adjacent Profile | Strong / Moderate / Weak / N/A |
    | Overall Recommendation | ADVANCE / HUMAN REVIEW / DECLINE |
    | One-line rationale | |

    Outcome Logic Applied:
    - Any unmet deal-breaker / hard requirement → DECLINE (Not Recommended), score ≤ 49% — overrides every rule below
    - Direct ≥ 80%                          → ADVANCE
    - Direct 65–79% + Strong adjacent       → HUMAN REVIEW
    - Direct 65–79% + Moderate adjacent     → HUMAN REVIEW
    - Direct < 65% + no adjacent credit     → DECLINE
    - Any 🔴 compliance flag                → HUMAN REVIEW regardless of score

─────────────────────────────────────────────────────────────────
AUDIT METADATA (auto-appended by platform — do not modify)
Screening ID : {SCREENING_ID}
Model Version: {MODEL_VERSION}
Timestamp    : {ISO_TIMESTAMP}
JD ID        : {JD_ID}
CV Hash      : {CV_HASH}
─────────────────────────────────────────────────────────────────

──────────────────────────────────────────────────────────────────
SECOND-TO-LAST LINE (required, machine-read — output exactly once, immediately before the FINAL_MATCH_SCORE line):
KEY_GAPS: <a single-line JSON array of the Q3 KEY GAPS, each a short plain-text string including its approximate % weight, e.g. ["No PLC programming experience (~20%)","No forklift certification (~10%)"]. Output KEY_GAPS: [] if there are none.>
Rules for this line: entries MUST be genuinely missing JD elements from Q3 only. NEVER list the criteria titles (years of experience, employment status, short-term positions, overqualification) as entries, NEVER list anything the CV or the CANDIDATE-DECLARED FACTS already evidence, and NEVER list unanswered screening questions.

FINAL LINE (required, machine-read — output exactly once, as the very last line):
FINAL_MATCH_SCORE: <the final match score as an integer 0-100, no % sign>
This number MUST equal the Adjusted Match Score if one applies, otherwise the Direct Match Score. Then apply the DEAL-BREAKER / HARD REQUIREMENTS CAP above: if any deal-breaker / mandatory requirement is unmet, this number MUST NOT exceed 49 (which renders the candidate Not Recommended), regardless of transferable skills or adjacent-sector strength.`;

function orNotSpecified(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  return v.length > 0 ? v : "(not specified)";
}

function listOrNotSpecified(values: string[] | null | undefined): string {
  const list = (values ?? []).map((v) => v.trim()).filter(Boolean);
  return list.length > 0 ? list.join(", ") : "(not specified)";
}

/** Fill the prompt template with role config + JD + audit metadata. */
export function fillEvaluationPrompt(input: {
  jdText: string;
  config: EvalConfig;
  metadata: EvalMetadata;
  declared?: { employmentStatus: string | null; yearsExperience: number | null };
}): string {
  const { jdText, config, metadata, declared } = input;
  return PROMPT_TEMPLATE.replace("{JD_TEXT}", jdText.trim() || "(missing)")
    .replace("{TARGET_SECTOR}", orNotSpecified(config.targetSector))
    .replace("{ADJACENT_SECTORS}", listOrNotSpecified(config.adjacentSectors))
    .replace("{TRANSFERABLE_SKILLS}", listOrNotSpecified(config.transferableSkills))
    .replace("{CUSTOM_KEYWORDS}", listOrNotSpecified(config.customKeywords))
    .replace("{DECLARED_EMPLOYMENT_STATUS}", orNotSpecified(declared?.employmentStatus))
    .replace("{DECLARED_YEARS_EXPERIENCE}",
      declared?.yearsExperience != null ? String(declared.yearsExperience) : "(not specified)")
    .replace("{SCREENING_ID}", metadata.screeningId)
    .replace("{MODEL_VERSION}", metadata.modelVersion)
    .replace("{ISO_TIMESTAMP}", metadata.isoTimestamp)
    .replace("{JD_ID}", metadata.jdId)
    .replace("{CV_HASH}", metadata.cvHash);
}

