const CANDIDATE_TRANSITIONS: Record<string, string[]> = {
  submitted: ["reviewing", "rejected"],
  reviewing: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["hired", "declined"],
  hired: ["guarantee_period"],
  guarantee_period: ["completed"],
  completed: [],
  rejected: [],
  declined: [],
};

export function canTransitionCandidate(from: string, to: string): boolean {
  return CANDIDATE_TRANSITIONS[from]?.includes(to) ?? false;
}
