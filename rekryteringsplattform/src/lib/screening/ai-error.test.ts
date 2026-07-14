import { describe, it, expect } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { isAiUnavailableError } from "./ai-error";

function apiError(status: number, message: string): unknown {
  const err = Object.create(Anthropic.APIError.prototype);
  Object.assign(err, { status, message });
  return err;
}

describe("isAiUnavailableError", () => {
  it("flags credit-exhaustion 400s", () => {
    expect(isAiUnavailableError(apiError(400, "Your credit balance is too low to access the Anthropic API."))).toBe(true);
  });
  it("flags auth / rate-limit / overload statuses", () => {
    expect(isAiUnavailableError(apiError(401, "invalid x-api-key"))).toBe(true);
    expect(isAiUnavailableError(apiError(429, "rate_limit_error"))).toBe(true);
    expect(isAiUnavailableError(apiError(529, "overloaded_error"))).toBe(true);
  });
  it("does not flag ordinary 400s or non-API errors", () => {
    expect(isAiUnavailableError(apiError(400, "max_tokens: field required"))).toBe(false);
    expect(isAiUnavailableError(new Error("boom"))).toBe(false);
  });
});
