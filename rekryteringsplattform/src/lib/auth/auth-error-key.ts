// Pure classifier: Supabase Auth error message → `auth.*` dictionary key.
// Kept out of the "use server" action file so it can be unit-tested. Never
// echo the raw message to the client (it can leak provider/schema details).

export type AuthErrorKey =
    | "invalidCredentials"
    | "confirmEmailFirst"
    | "emailAlreadyRegistered"
    | "confirmationEmailFailed"
    | "tooManyAttempts"
    | "passwordRequirements"
    | "account_unavailable";

export function authErrorKey(message: string | undefined | null): AuthErrorKey {
    if (!message) return "account_unavailable";
    if (/invalid login credentials/i.test(message)) return "invalidCredentials";
    if (/email not confirmed/i.test(message)) return "confirmEmailFirst";
    if (/already (been )?registered|already exists/i.test(message)) return "emailAlreadyRegistered";
    // Supabase's built-in SMTP is restricted (team addresses only, a few per
    // hour) until a custom SMTP is configured — surface it as a mail problem,
    // not as "service unavailable".
    if (/sending .*email|email rate limit/i.test(message)) return "confirmationEmailFailed";
    if (/rate.*limit|too many|429/i.test(message)) return "tooManyAttempts";
    if (/password (should|must|is too)|weak password/i.test(message)) return "passwordRequirements";
    return "account_unavailable";
}
