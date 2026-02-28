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
import { sendInternalRecruiterEmail } from "@/lib/email/internal-notifications";
import { createTranslator } from "@/i18n/server";

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
        return { error: error.message };
    }

    // Get user role for redirect
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role || "company";

    redirect(`/${role}`);
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
        return { error: error.message };
    }

    // Check if the email is already registered (empty identities means existing account)
    if (data.user && !data.user.identities?.length) {
        const t = await createTranslator();
        return { error: t("serverErrors.emailAlreadyRegistered") };
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
            const t = await createTranslator();
            return { error: t("serverErrors.companyCreationFailed") };
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
        return { error: error.message };
    }

    // Check if the email is already registered (empty identities means existing account)
    if (data.user && !data.user.identities?.length) {
        const t = await createTranslator();
        return { error: t("serverErrors.emailAlreadyRegistered") };
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
            const t = await createTranslator();
            return { error: t("serverErrors.recruiterCreationFailed") };
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
    }

    redirect("/recruiter/profile?onboarding=1");
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
        const t = await createTranslator();
        return { error: t("serverErrors.resetLinkFailed") };
    }

    return { success: true };
}
