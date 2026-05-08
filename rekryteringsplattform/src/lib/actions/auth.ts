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

function mapAuthError(message: string | undefined): string {
  if (!message) return "Tjänsten är otillgänglig just nu. Försök igen.";
  if (/invalid login credentials/i.test(message)) return "Felaktig e-post eller lösenord.";
  if (/email not confirmed/i.test(message)) return "Bekräfta din e-post först.";
  if (/rate.*limit|too many|429/i.test(message)) return "För många försök. Vänta en stund och försök igen.";
  return "Tjänsten är otillgänglig just nu. Försök igen.";
}

export async function login(formData: FormData) {
    const supabase = await createClient();

    const parsed = validateLoginForm(formData);
    if (!parsed.success) {
        return { error: parsed.error };
    }

    const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
    });

    if (error) {
        console.error("Auth error:", error);
        return { error: mapAuthError(error.message) };
    }

    // Get user role for redirect
    const { data: { user } } = await supabase.auth.getUser();
    const userRole = user?.app_metadata?.role || user?.user_metadata?.role || "company";
    const requestedRole = formData.get("requestedRole") as string | null;

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
        console.error("Auth error:", error);
        return { error: mapAuthError(error.message) };
    }

    // Create company profile using Admin client to bypass RLS
    if (data.user) {
        const { error: companyError } = await supabaseAdmin.from("companies").insert({
            user_id: data.user.id,
            company_name: parsed.data.company_name,
            org_number: parsed.data.org_number,
            industry: parsed.data.industry,
        });

        if (companyError) {
            console.error("Company creation failed:", companyError);
            await supabaseAdmin.auth.admin.deleteUser(data.user.id);
            return { error: "Kunde inte skapa företagsprofil. Försök igen." };
        }
    }

    redirect("/company");
}

export async function registerRecruiter(formData: FormData) {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    const appUrl = await getAppUrl();

    const parsed = validateRegisterRecruiterForm(formData);
    if (!parsed.success) {
        return { error: parsed.error };
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
        console.error("Auth error:", error);
        return { error: mapAuthError(error.message) };
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
        });

        if (recruiterError) {
            console.error("Recruiter creation failed:", recruiterError);
            await supabaseAdmin.auth.admin.deleteUser(data.user.id);
            return { error: "Kunde inte skapa rekryterarprofil. Försök igen." };
        }

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
                    `Frilansavtal godkänt: ${parsed.data.agreement_freelance_recruiter ? "Ja" : "Nej"}`,
                    `Garantiperiod/provision godkänt: ${parsed.data.agreement_commission_after_guarantee ? "Ja" : "Nej"}`,
                    "",
                    `User ID: ${data.user.id}`,
                ].join("\n"),
            });
        } catch (mailError) {
            console.error("Failed to send recruiter registration email:", mailError);
        }

        try {
            await sendUserEmail({
                to: parsed.data.email,
                subject: "Thank you for applying to Recruito",
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
                      <h2 style="color:#0f172a;">Thank you, ${parsed.data.full_name}!</h2>
                      <p>We've received your application to join Recruito as a freelance recruiter.</p>
                      <p>An administrator at Recruito will get back to you once we have fact-checked your information.</p>
                      <p style="color:#64748b;font-size:13px;">If you didn't submit this application, please ignore this email.</p>
                      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
                      <p style="color:#94a3b8;font-size:12px;">Recruito · recruito.eu</p>
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

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${appUrl}/reset-password`,
    });

    if (error) {
        console.error("Password reset request failed:", error);
        return { error: "Kunde inte skicka återställningslänk just nu" };
    }

    return { success: true };
}
