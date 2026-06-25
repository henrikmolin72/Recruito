// The company Jobs list "Recruiters" column shows how many recruiters are still
// working the job WITHOUT having delivered a candidate. Per product:
//   count = DISTINCT recruiters who hold a mandate on the job, MINUS those who
//           have already delivered a screened candidate (their work shows in the
//           "Candidates" column instead).
// We dedupe the mandate rows by recruiter_id: a job can accumulate duplicate or
// stale job_mandates rows (e.g. release + re-claim, or expiry that frees the slot
// without removing the row), so counting RAW rows over-states the recruiter count.
// A recruiter whose mandate expired WITHOUT a delivery still counts here; a
// recruiter who delivered drops out even if they presented several candidates.
// Only candidates Recruito has screened/approved (recruito_screened_at set) count
// as a delivery — the same visibility gate the Candidates column uses.
export function countRecruitersWithoutDelivery(
    mandateRecruiterIds: Array<string | null | undefined>,
    candidates: Array<{ recruito_screened_at?: string | null; recruiter_id?: string | null }>,
): number {
    const deliveringRecruiters = new Set(
        (candidates || [])
            .filter((c) => c.recruito_screened_at && c.recruiter_id)
            .map((c) => c.recruiter_id as string),
    );
    const workingRecruiters = new Set(
        (mandateRecruiterIds || []).filter(
            (id): id is string => Boolean(id) && !deliveringRecruiters.has(id as string),
        ),
    );
    return workingRecruiters.size;
}
