const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["active", "cancelled"],
  active: ["paused", "filled", "closed", "cancelled"],
  paused: ["active", "closed", "cancelled"],
  filled: ["closed"],
  closed: [],
  cancelled: [],
};

export function canTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
