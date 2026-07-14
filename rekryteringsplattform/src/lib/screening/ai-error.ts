import Anthropic from "@anthropic-ai/sdk";

// Operator-side Anthropic failures (billing/credits, auth, provider rate limits,
// overload/5xx). These mean "AI is down for us" — the UI shows a dedicated
// message instead of the generic "try again" (which can't help the user).
export function isAiUnavailableError(err: unknown): boolean {
  if (!(err instanceof Anthropic.APIError)) return false;
  const status = err.status ?? 0;
  if (status === 401 || status === 403 || status === 429 || status >= 500) return true;
  return status === 400 && /credit balance/i.test(err.message ?? "");
}
