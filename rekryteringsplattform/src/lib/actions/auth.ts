"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getAppUrl } from "@/lib/app-url";
import {
    validateLoginForm,
    validatePasswordResetRequestForm,
    validateRegisterCompanyForm,
    validateRegisterRecruiterForm,
} from "@/lib/validation/forms";
import { mapExperienceBracketToYears } from "@/lib/recruiter-onboarding-options";
import { sendInternalRecruiterEmail, sendUserEmail } from "@/lib/email/internal-notifications";
import { createTranslator } from "@/i18n/server";
import { headers } from "next/headers";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { authErrorKey } from "@/lib/auth/auth-error-key";

// User-facing auth messages come from the dictionary (the UI may be English,
// Danish or Norwegian — hardcoded Swedish read as "an error" to a client).
async function authMessage(key: string): Promise<string> {
  const t = await createTranslator();
  return t(`auth.${key}`);
}

async function mapAuthError(message: string | undefined): Promise<string> {
  return authMessage(authErrorKey(message));
}

// Supabase answers a signUp for an EXISTING, UNCONFIRMED email by returning
// that same user (and re-sending the confirmation) — not with an error. The
// profile insert then fails on the user_id unique key, and "cleaning up" by
// deleting the user wiped a real account (found 2026-09-06). Check first.
async function emailRegistered(admin: ReturnType<typeof createAdminClient>, email: string): Promise<boolean> {
  const { data, error } = await admin.from("profiles").select("id").eq("email", email.toLowerCase()).maybeSingle();
  if (error) logSafeError("email-precheck", error); // fails open on purpose, but visibly
  return !!data;
}

// The invariant that makes any post-signUp mutation safe: THIS request created
// the user. A pre-existing user (however we got it back from signUp) must never
// be inserted for, re-roled, or deleted. 5 min tolerates clock skew.
function isFreshUser(user: { created_at?: string | null }): boolean {
  const createdMs = Date.parse(user.created_at ?? "");
  return Number.isFinite(createdMs) && Date.now() - createdMs < 5 * 60_000;
}

// Best-effort client IP for pre-auth rate-limit keys. On Vercel the first
// x-forwarded-for entry IS the real client (the platform sets it); behind a
// different/untrusted ingress this header is spoofable, so the per-IP bucket
// below assumes Vercel-style trusted forwarding. Missing-header requests pool
// under "unknown" — acceptable on Vercel where the header is always present.
async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

// Two-bucket auth throttle: a tight per-(email+IP) bucket plus a coarser per-IP
// bucket, so email rotation (credential stuffing across many accounts from one
// source) still trips the per-IP cap. Returns true when EITHER bucket is
// exhausted. consumeRateLimit fails open if its backing store is unavailable.
async function authRateLimited(
  action: string,
  email: string,
  perEmailIp: number,
  perIp: number,
): Promise<boolean> {
  const ip = await getClientIp();
  const windowMs = 15 * 60 * 1000;
  const [byEmailIp, byIp] = await Promise.all([
    consumeRateLimit({ key: `auth:${action}:${email.toLowerCase()}:${ip}`, limit: perEmailIp, windowMs }),
    consumeRateLimit({ key: `auth:${action}:ip:${ip}`, limit: perIp, windowMs }),
  ]);
  return !byEmailIp.allowed || !byIp.allowed;
}

// Log only safe, non-PII fields from a Supabase/Postgres error — full error
// objects can carry submitted column values (names, org numbers) into logs/Sentry.
function logSafeError(scope: string, error: unknown) {
  const e = error as { code?: string; status?: number; message?: string } | null;
  console.error(`[auth:${scope}]`, { code: e?.code, status: e?.status, message: e?.message });
}

export async function login(formData: FormData) {
    const supabase = await createClient();

    const parsed = validateLoginForm(formData);
    if (!parsed.success) {
        return { error: parsed.error };
    }

    // Throttle login: 10/15min per email+IP, plus 50/15min per IP to cap
    // email-rotation credential stuffing from a single source.
    if (await authRateLimited("login", parsed.data.email, 10, 50)) {
        return { error: await authMessage("tooManyAttempts") };
    }

    const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
    });

    if (error) {
        logSafeError("auth", error);
        return { error: await mapAuthError(error.message) };
    }

    // Get user role for redirect. Admin role MUST come from app_metadata only —
    // user_metadata is client-writable via supabase.auth.updateUser(), so trusting
    // it would let any user self-promote to admin. user_metadata.role is allowed
    // as a fallback only for non-admin roles (set during signup). Whitelist the
    // final value to prevent path injection in the redirect target.
    const { data: { user } } = await supabase.auth.getUser();
    const appRole = user?.app_metadata?.role;
    const metaRole = user?.user_metadata?.role;
    const candidateRole =
        appRole === "admin"
            ? "admin"
            : metaRole === "company" || metaRole === "recruiter"
                ? metaRole
                : appRole === "company" || appRole === "recruiter"
                    ? appRole
                    : "company";
    const userRole: "admin" | "company" | "recruiter" = candidateRole;
    const requestedRole = formData.get("requestedRole") as string | null;

    // For recruiters: check approval_status before allowing access
    if (userRole === "recruiter" && user) {
        const t = await createTranslator();
        const { data: recruiter, error: recruiterError } = await supabase
            .from("recruiters")
            .select("approval_status")
            .eq("user_id", user.id)
            .maybeSingle();

        if (recruiterError || !recruiter) {
            await supabase.auth.signOut();
            return { error: t("auth.account_unavailable") };
        }

        const status = recruiter.approval_status;
        if (status === "suspended" || status === "blocked" || status === "rejected") {
            await supabase.auth.signOut();
            return { error: t("auth.account_blocked") };
        }
        if (status === "pending") {
            await supabase.auth.signOut();
            return { error: t("auth.account_pending") };
        }
    }

    // For companies: block access until an admin approves the company.
    if (userRole === "company" && user) {
        const t = await createTranslator();
        const { data: company } = await supabase
            .from("companies")
            .select("approval_status")
            .eq("user_id", user.id)
            .maybeSingle();

        const status = company?.approval_status;
        if (status === "suspended" || status === "rejected") {
            await supabase.auth.signOut();
            return { error: t("auth.account_blocked") };
        }
        if (status === "pending") {
            await supabase.auth.signOut();
            return { error: t("auth.account_pending") };
        }
    }

    // Admin users can log in as company or admin
    if (requestedRole && userRole === "admin" && (requestedRole === "company" || requestedRole === "admin")) {
        redirect(`/${requestedRole}`);
    }

    redirect(`/${userRole}`);
}

export async function registerCompany(formData: FormData) {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    const appUrl = await getAppUrl();

    const parsed = validateRegisterCompanyForm(formData);
    if (!parsed.success) {
        return { error: parsed.error };
    }

    // The existing-email answer is an enumeration oracle (accepted, see
    // Decisions/2026-09-06-signup-enumeration-tradeoff): real humans register
    // once, so the per-IP cap is tight.
    if (await authRateLimited("register", parsed.data.email, 3, 5)) {
        return { error: await authMessage("tooManyAttempts") };
    }
    if (await emailRegistered(supabaseAdmin, parsed.data.email)) {
        return { error: await authMessage("emailAlreadyRegistered") };
    }

    const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
            emailRedirectTo: `${appUrl}/callback`,
            data: {
                role: "company",
                full_name: parsed.data.full_name,
            },
        },
    });

    if (error) {
        logSafeError("auth", error);
        return { error: await mapAuthError(error.message) };
    }

    // With email confirmation on, Supabase answers a duplicate email with a
    // fake user (no identities) instead of an error — say so, don't insert.
    if (data.user && ((data.user.identities?.length ?? 0) === 0 || !isFreshUser(data.user))) {
        return { error: await authMessage("emailAlreadyRegistered") };
    }

    // Create company profile using Admin client to bypass RLS
    if (data.user) {
        const { error: companyError } = await supabaseAdmin.from("companies").insert({
            user_id: data.user.id,
            company_name: parsed.data.company_name,
            industry: parsed.data.industry,
            approval_status: "pending",
        });

        if (companyError) {
            logSafeError("company-create", companyError);
            // 23505 = this user already has a company row → the account
            // pre-existed (pre-check raced); deleting it would destroy it.
            if (companyError.code === "23505") return { error: await authMessage("emailAlreadyRegistered") };
            await supabaseAdmin.auth.admin.deleteUser(data.user.id);
            return { error: await authMessage("companyProfileFailed") };
        }

        // Set the authoritative role in app_metadata (server-only, not user-writable).
        // This is the sole trusted source for the admin gate; never grant admin here.
        const { error: roleError } = await supabaseAdmin.auth.admin.updateUserById(
            data.user.id,
            { app_metadata: { role: "company" } }
        );
        if (roleError) logSafeError("set-app-role", roleError);

        try {
            await sendInternalRecruiterEmail({
                subject: `Ny företagsregistrering: ${parsed.data.company_name}`,
                text: [
                    "Ny company registration form inkom.",
                    "",
                    `Företag: ${parsed.data.company_name}`,
                    `Kontaktperson: ${parsed.data.full_name}`,
                    `E-post: ${parsed.data.email}`,
                    `Bransch: ${parsed.data.industry || "—"}`,
                    `Hur de hörde talas om oss: ${parsed.data.how_heard}`,
                    "",
                    `User ID: ${data.user.id}`,
                ].join("\n"),
            });
        } catch (mailError) {
            console.error("Failed to send company registration email:", mailError);
        }
    }

    // No session exists until the email is confirmed (and the account is
    // admin-approved), so /company would just bounce to /login with no
    // explanation — land on an explicit "check your email" state instead.
    redirect("/register/company?submitted=1");
}

export async function registerRecruiter(formData: FormData) {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    const appUrl = await getAppUrl();

    const parsed = validateRegisterRecruiterForm(formData);
    if (!parsed.success) {
        return { error: parsed.error };
    }

    if (await authRateLimited("register", parsed.data.email, 3, 5)) {
        return { error: await authMessage("tooManyAttempts") };
    }
    if (await emailRegistered(supabaseAdmin, parsed.data.email)) {
        return { error: await authMessage("emailAlreadyRegistered") };
    }

    const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
            emailRedirectTo: `${appUrl}/callback`,
            data: {
                role: "recruiter",
                full_name: parsed.data.full_name,
            },
        },
    });

    if (error) {
        logSafeError("auth", error);
        return { error: await mapAuthError(error.message) };
    }

    if (data.user && ((data.user.identities?.length ?? 0) === 0 || !isFreshUser(data.user))) {
        return { error: await authMessage("emailAlreadyRegistered") };
    }

    // Create recruiter profile using Admin client to bypass RLS
    if (data.user) {
        const { error: recruiterError } = await supabaseAdmin.from("recruiters").insert({
            user_id: data.user.id,
            linkedin_url: parsed.data.linkedin_url,
            years_experience: mapExperienceBracketToYears(parsed.data.years_experience_bracket),
            current_country: parsed.data.current_country,
            experience_bracket: parsed.data.years_experience_bracket,
            agreement_freelance_recruiter: parsed.data.agreement_freelance_recruiter,
            agreement_commission_after_guarantee: parsed.data.agreement_commission_after_guarantee,
            legal_eligibility_confirmed: parsed.data.legal_eligibility_confirmed,
        });

        if (recruiterError) {
            logSafeError("recruiter-create", recruiterError);
            if (recruiterError.code === "23505") return { error: await authMessage("emailAlreadyRegistered") };
            await supabaseAdmin.auth.admin.deleteUser(data.user.id);
            return { error: await authMessage("recruiterProfileFailed") };
        }

        // Set the authoritative role in app_metadata (server-only, not user-writable).
        // This is the sole trusted source for the admin gate; never grant admin here.
        const { error: roleError } = await supabaseAdmin.auth.admin.updateUserById(
            data.user.id,
            { app_metadata: { role: "recruiter" } }
        );
        if (roleError) logSafeError("set-app-role", roleError);

        try {
            await sendInternalRecruiterEmail({
                subject: `Ny rekryteraransökan: ${parsed.data.full_name}`,
                text: [
                    "Ny recruiter registration form inkom.",
                    "",
                    `Namn: ${parsed.data.full_name}`,
                    `E-post: ${parsed.data.email}`,
                    `Land: ${parsed.data.current_country}`,
                    `LinkedIn: ${parsed.data.linkedin_url || "—"}`,
                    `Erfarenhet: ${parsed.data.years_experience_bracket}`,
                    `Hur de hörde talas om oss: ${parsed.data.how_heard}`,
                    `Frilansavtal godkänt: ${parsed.data.agreement_freelance_recruiter ? "Ja" : "Nej"}`,
                    `Garantiperiod/provision godkänt: ${parsed.data.agreement_commission_after_guarantee ? "Ja" : "Nej"}`,
                    `Behörig att tillhandahålla rekryteringstjänster: ${parsed.data.legal_eligibility_confirmed ? "Ja" : "Nej"}`,
                    "",
                    `User ID: ${data.user.id}`,
                ].join("\n"),
            });
        } catch (mailError) {
            console.error("Failed to send recruiter registration email:", mailError);
        }

        try {
            const t = await createTranslator();
            const escapedName = parsed.data.full_name.replace(/[<>&"']/g, (c) =>
                ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]!)
            );
            await sendUserEmail({
                to: parsed.data.email,
                // Account-lifecycle mail: must reach the user regardless of
                // notification preferences.
                transactional: true,
                subject: t("auth.recruiterConfirmEmailSubject"),
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
                      <h2 style="color:#0f172a;">${t("auth.recruiterConfirmEmailGreeting", { name: escapedName })}</h2>
                      <p>${t("auth.recruiterConfirmEmailBody1")}</p>
                      <p>${t("auth.recruiterConfirmEmailBody2")}</p>
                      <p style="color:#64748b;font-size:13px;">${t("auth.recruiterConfirmEmailIgnore")}</p>
                      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
                      <p style="color:#94a3b8;font-size:12px;">Recruito · recruitomatch.com</p>
                    </div>
                `,
            });
        } catch (mailError) {
            console.error("Failed to send recruiter confirmation email:", mailError);
        }
    }

    redirect("/register/recruiter?submitted=1");
}

export async function logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
    const supabase = await createClient();
    const appUrl = await getAppUrl();

    const parsed = validatePasswordResetRequestForm(formData);
    if (!parsed.success) {
        return { error: parsed.error };
    }

    // Throttle reset: 5/15min per email+IP, plus 20/15min per IP. These also
    // trigger outbound email, so keep the caps tight.
    if (await authRateLimited("password-reset", parsed.data.email, 5, 20)) {
        return { error: await authMessage("tooManyAttempts") };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${appUrl}/reset-password`,
    });

    if (error) {
        logSafeError("password-reset", error);
        return { error: await authMessage("passwordResetFailed") };
    }

    return { success: true };
}
