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
        return { error: error.message };
    }

    // Create recruiter profile using Admin client to bypass RLS
    if (data.user) {
        const { error: recruiterError } = await supabaseAdmin.from("recruiters").insert({
            user_id: data.user.id,
            headline: parsed.data.headline,
            linkedin_url: parsed.data.linkedin_url,
            years_experience: parsed.data.years_experience,
        });

        if (recruiterError) {
            console.error("Recruiter creation failed:", recruiterError);
            await supabaseAdmin.auth.admin.deleteUser(data.user.id);
            return { error: "Kunde inte skapa rekryterarprofil. Försök igen." };
        }
    }

    redirect("/recruiter");
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
