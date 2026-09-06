import { describe, it, expect } from "vitest";
import { authErrorKey } from "./auth-error-key";
import en from "@/i18n/dictionaries/en.json";
import sv from "@/i18n/dictionaries/sv.json";
import no from "@/i18n/dictionaries/no.json";
import da from "@/i18n/dictionaries/da.json";

// Spec (Sajid 2026-09-06, "client account error"): a signup that fails must
// tell the user WHY in their own language — an existing email or a mail
// delivery problem must not collapse into a Swedish "service unavailable".
describe("authErrorKey", () => {
    it.each([
        ["Invalid login credentials", "invalidCredentials"],
        ["Email not confirmed", "confirmEmailFirst"],
        ["User already registered", "emailAlreadyRegistered"],
        ["A user with this email address has already been registered", "emailAlreadyRegistered"],
        ["Error sending confirmation email", "confirmationEmailFailed"],
        ["email rate limit exceeded", "confirmationEmailFailed"],
        ["Request rate limit reached", "tooManyAttempts"],
        ["Too many requests", "tooManyAttempts"],
        ["Password should be at least 10 characters", "passwordRequirements"],
    ])("%s → %s", (message, key) => {
        expect(authErrorKey(message)).toBe(key);
    });

    it("falls back to the generic key for unknown/empty messages (never echoes them)", () => {
        expect(authErrorKey("relation \"companies\" does not exist")).toBe("account_unavailable");
        expect(authErrorKey(undefined)).toBe("account_unavailable");
        expect(authErrorKey("")).toBe("account_unavailable");
    });

    it("every key resolves to a string in all four dictionaries", () => {
        const keys = [
            "invalidCredentials",
            "confirmEmailFirst",
            "emailAlreadyRegistered",
            "confirmationEmailFailed",
            "tooManyAttempts",
            "passwordRequirements",
            "account_unavailable",
            "companyProfileFailed",
            "recruiterProfileFailed",
            "companyThankYouTitle",
            "companyThankYouBody",
        ] as const;
        for (const dict of [en, sv, no, da]) {
            for (const k of keys) {
                expect(typeof (dict.auth as Record<string, unknown>)[k]).toBe("string");
            }
        }
    });
});
