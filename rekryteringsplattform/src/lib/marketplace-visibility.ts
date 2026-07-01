// Which jobs a recruiter still sees in the Browse Jobs / Assignment marketplace.
// A job the recruiter currently holds an ACTIVE mandate on already lives under
// "My Mandates" and must not reappear here — regardless of the job's status.
// (Paused jobs used to leak back in after a re-claim.) Jobs the recruiter has
// NOT actively claimed stay visible even when full (rendered as "Slots full"
// with no claim action).
export function selectMarketplaceJobs<T extends { id: string }>(
    jobs: T[],
    activeClaimedJobIds: Set<string>,
): T[] {
    return jobs.filter((job) => !activeClaimedJobIds.has(job.id));
}
