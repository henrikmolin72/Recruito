"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
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

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("full_name") as string;
    const companyName = formData.get("company_name") as string;
    const orgNumber = formData.get("org_number") as string;
    const industry = formData.get("industry") as string;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: "company",
                full_name: fullName,
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
            company_name: companyName,
            org_number: orgNumber || null,
            industry: industry || null,
        });

        if (companyError) {
            // If company creation fails, we might want to clean up the user, but for now just return error
            console.error("Company creation failed:", companyError);
            return { error: "Kunde inte skapa företagsprofil: " + companyError.message };
        }
    }

    redirect("/company");
}

export async function registerRecruiter(formData: FormData) {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("full_name") as string;
    const headline = formData.get("headline") as string;
    const linkedinUrl = formData.get("linkedin_url") as string;
    const yearsExperience = parseInt(formData.get("years_experience") as string) || 0;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: "recruiter",
                full_name: fullName,
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
            headline: headline || null,
            linkedin_url: linkedinUrl || null,
            years_experience: yearsExperience || null,
        });

        if (recruiterError) {
            console.error("Recruiter creation failed:", recruiterError);
            return { error: "Kunde inte skapa rekryterarprofil: " + recruiterError.message };
        }
    }

    redirect("/recruiter");
}

export async function logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
}
