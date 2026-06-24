// The company Jobs list "Recruiters" column shows how many recruiters are still
// working the job WITHOUT having delivered a candidate. Per product:
//   count = total recruiters who took the mandate − recruiters who presented a
//           candidate (their work shows in the "Candidates" column instead).
// A recruiter whose mandate expired without a delivery STILL counts here; a
// recruiter who delivered drops out even if they presented several candidates
// (deduped by recruiter_id). Only candidates Recruito has screened/approved
// (recruito_screened_at set) count as a delivery — same visibility gate the
// Candidates column uses.
export function countRecruitersWithoutDelivery(
    totalMandates: number,
    candidates: Array<{ recruito_screened_at?: string | null; recruiter_id?: string | null }>,
): number {
    const deliveringRecruiters = new Set(
        (candidates || [])
            .filter((c) => c.recruito_screened_at && c.recruiter_id)
            .map((c) => c.recruiter_id as string),
    );
    return Math.max(totalMandates - deliveringRecruiters.size, 0);
}
