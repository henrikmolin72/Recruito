import {
    normalizeCandidateStatusForWorkflow,
    TERMINAL_CANDIDATE_STATUSES,
} from "@/lib/candidate-workflow";

export function normalizeIdentity(value: string | null | undefined) {
    return value?.trim().toLowerCase() || null;
}

export function candidateMatchesIdentity(
    candidate: any,
    email: string | null,
    linkedinUrl: string | null,
) {
    const candidateEmail = normalizeIdentity(candidate?.email);
    const candidateLinkedIn = normalizeIdentity(candidate?.linkedin_url);

    const emailMatch = !!email && candidateEmail === email;
    const linkedInMatch = !!linkedinUrl && candidateLinkedIn === linkedinUrl;
    return emailMatch || linkedInMatch;
}

export function isClientEngagementActiveStatus(status: string | null | undefined) {
    const normalized = normalizeCandidateStatusForWorkflow(status);
    return !TERMINAL_CANDIDATE_STATUSES.has(normalized);
}
