// Structured candidate pre-submission evaluation prompt.
//
// The template is the client's final prompt, verbatim, with {PLACEHOLDER}
// tokens. Phase 1 (this file) fills it and assembles a clipboard payload so a
// recruiter can paste it into an external AI tool. Phase 2 reuses the same
// filled prompt for a server-side Anthropic call.

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

export type ScreeningAnswer = { question: string; answer: string };

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
- All output must be in English.
- Use red marks 🔴 as specified per field.
- HARD REQUIREMENTS CAP: Treat any requirement the JD marks as mandatory / required / "must have" (including a required working language, a required certification, or a legally required work authorization) as a gate. If the CV does not demonstrate a mandatory requirement, NEITHER the Direct Match Score NOR the Adjusted Match Score may exceed 49%, regardless of other strengths or transferable skills. If several mandatory requirements are unmet, score proportionally lower. A strong adjacent profile can still be noted, but never lifts any score above 49% while a mandatory requirement is unmet.
─────────────────────────────────────────────────────────────────

Review the CV against the JD above. Return ALL sections below in TABLE FORMAT
unless otherwise specified.

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

4. YEARS OF PROFESSIONAL EXPERIENCE
   Total full-time professional experience in years.
   EXCLUDE: internships, apprenticeships, freelance, part-time, volunteer work.
   (Short reply: X years Y months)

5. CURRENT EMPLOYMENT STATUS
   Is the candidate currently employed? Include:
   - Current employer name and start date
   - Employment type if stated
   🔴 Red mark if: unemployed, in internship, apprenticeship, or freelance-only status.

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
FINAL LINE (required, machine-read — output exactly once, as the very last line):
FINAL_MATCH_SCORE: <the final match score as an integer 0-100, no % sign>
This number MUST equal the Adjusted Match Score if one applies, otherwise the Direct Match Score. Then apply the HARD REQUIREMENTS CAP above: if any mandatory requirement is unmet, this number MUST NOT exceed 49, regardless of transferable skills or adjacent-sector strength.`;

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
}): string {
  const { jdText, config, metadata } = input;
  return PROMPT_TEMPLATE.replace("{JD_TEXT}", jdText.trim() || "(missing)")
    .replace("{TARGET_SECTOR}", orNotSpecified(config.targetSector))
    .replace("{ADJACENT_SECTORS}", listOrNotSpecified(config.adjacentSectors))
    .replace("{TRANSFERABLE_SKILLS}", listOrNotSpecified(config.transferableSkills))
    .replace("{CUSTOM_KEYWORDS}", listOrNotSpecified(config.customKeywords))
    .replace("{SCREENING_ID}", metadata.screeningId)
    .replace("{MODEL_VERSION}", metadata.modelVersion)
    .replace("{ISO_TIMESTAMP}", metadata.isoTimestamp)
    .replace("{JD_ID}", metadata.jdId)
    .replace("{CV_HASH}", metadata.cvHash);
}

/**
 * Build the full clipboard payload: the filled prompt followed by a Candidate
 * Materials appendix (CV + screening Q&A) the prompt refers to but has no
 * placeholder for. cvText is optional — when absent the recruiter attaches the
 * downloaded CV file in their AI tool instead.
 */
export function assembleClipboardPayload(input: {
  prompt: string;
  cvText: string | null;
  screeningAnswers: ScreeningAnswer[];
}): string {
  const { prompt, cvText, screeningAnswers } = input;

  const cvBlock = cvText && cvText.trim().length > 0
    ? cvText.trim()
    : "[Attach the candidate's CV file in your AI tool — download it from the candidate page.]";

  const qaBlock = screeningAnswers.length > 0
    ? screeningAnswers
        .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || "(no answer provided)"}`)
        .join("\n\n")
    : "(no screening questions for this role)";

  return [
    prompt,
    "",
    "══════════════════════════════════════════════════════════════════",
    "CANDIDATE MATERIALS (reviewed against the JD above)",
    "══════════════════════════════════════════════════════════════════",
    "",
    "CV:",
    cvBlock,
    "",
    "SCREENING QUESTIONS & ANSWERS:",
    qaBlock,
  ].join("\n");
}
