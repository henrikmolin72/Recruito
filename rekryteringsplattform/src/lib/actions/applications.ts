"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicApplicationFormState = {
  error?: string;
};

const MAX_CV_TEXT_LENGTH = 40_000;
const MAX_COVER_LETTER_LENGTH = 10_000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const publicApplicationSchema = z.object({
  mandate_id: z.string().uuid("Ogiltig länk"),
  full_name: z.string().trim().min(2, "Ange fullständigt namn").max(120, "Namn är för långt"),
  email: z
    .union([z.string().trim().email("Ogiltig e-postadress"), z.literal("")])
    .transform((value) => (value ? value : null)),
  phone: z.string().trim().max(40, "Telefonnummer är för långt").optional().transform((v) => (v && v.length ? v : null)),
  linkedin_url: z
    .union([z.string().trim().url("Ogiltig LinkedIn-URL"), z.literal("")])
    .transform((value) => (value ? value : null)),
  cv_text: z
    .string()
    .trim()
    .min(50, "Klistra in CV-text (minst 50 tecken)")
    .max(MAX_CV_TEXT_LENGTH, `CV-text får max vara ${MAX_CV_TEXT_LENGTH} tecken`),
  cover_letter_text: z
    .string()
    .trim()
    .max(MAX_COVER_LETTER_LENGTH, `Personligt brev får max vara ${MAX_COVER_LETTER_LENGTH} tecken`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

type PublicMandateContext = {
  mandateId: string;
  recruiterId: string;
  jobId: string;
  isActive: boolean;
  jobStatus: string | null;
  jobTitle: string;
  jobDescription: string | null;
  location: string | null;
  companyName: string | null;
};

function normalizeMandateRow(row: any): PublicMandateContext | null {
  if (!row) return null;
  const job = Array.isArray(row.job) ? row.job[0] : row.job;
  const company = Array.isArray(job?.company) ? job.company[0] : job?.company;

  if (!row.id || !row.recruiter_id || !job?.id) return null;

  return {
    mandateId: row.id,
    recruiterId: row.recruiter_id,
    jobId: job.id,
    isActive: !!row.is_active,
    jobStatus: job.status ?? null,
    jobTitle: job.title || "Untitled role",
    jobDescription: job.description ?? null,
    location: job.location ?? null,
    companyName: company?.company_name ?? null,
  };
}

export async function getPublicMandateApplicationContext(mandateId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_mandates")
    .select(`
      id,
      recruiter_id,
      is_active,
      job:jobs (
        id,
        title,
        description,
        location,
        status,
        company:companies (company_name)
      )
    `)
    .eq("id", mandateId)
    .maybeSingle();

  if (error) {
    console.error("Error loading public mandate application context:", error);
    return null;
  }

  return normalizeMandateRow(data);
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function submitPublicMandateApplication(
  _prevState: PublicApplicationFormState,
  formData: FormData
): Promise<PublicApplicationFormState> {
  const honeypot = formData.get("company_website");
  if (typeof honeypot === "string" && honeypot.trim()) {
    // Silent success for bots.
    const mandateId = typeof formData.get("mandate_id") === "string" ? (formData.get("mandate_id") as string) : "";
    if (mandateId) redirect(`/apply/${mandateId}?submitted=1`);
    return {};
  }

  const parsed = publicApplicationSchema.safeParse({
    mandate_id: formData.get("mandate_id"),
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    linkedin_url: formData.get("linkedin_url"),
    cv_text: formData.get("cv_text"),
    cover_letter_text: formData.get("cover_letter_text"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Ogiltig ansökan" };
  }

  const context = await getPublicMandateApplicationContext(parsed.data.mandate_id);
  if (!context || !context.isActive || context.jobStatus !== "active") {
    return { error: "Den här ansökningslänken är inte aktiv längre." };
  }

  const admin = createAdminClient();

  let cvFilePath: string | null = null;
  const cvFile = formData.get("cv_file");
  if (cvFile instanceof File && cvFile.size > 0) {
    if (cvFile.size > MAX_FILE_SIZE) {
      return { error: "CV-filen får max vara 10 MB." };
    }

    const safeName = sanitizeFileName(cvFile.name || "cv");
    const path = `applications/${context.mandateId}/${Date.now()}-${safeName}`;
    const { data: uploadData, error: uploadError } = await admin.storage
      .from("cvs")
      .upload(path, cvFile, { upsert: false });

    if (uploadError) {
      console.error("Public application CV upload error:", uploadError);
      return { error: "Kunde inte ladda upp CV-fil just nu. Försök igen eller klistra in CV-text." };
    }
    cvFilePath = uploadData?.path || null;
  }

  const metadata: Record<string, unknown> = {
    mandate_id: context.mandateId,
    public_apply: true,
    submitted_via: "public_mandate_link",
  };
  if (cvFilePath) metadata.cv_file_path = cvFilePath;

  const { error: insertError } = await admin.from("applications").insert({
    job_id: context.jobId,
    recruiter_id: context.recruiterId,
    full_name: parsed.data.full_name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    linkedin_url: parsed.data.linkedin_url,
    cv_text: parsed.data.cv_text,
    cover_letter_text: parsed.data.cover_letter_text,
    source: "public_apply_link",
    status: "new",
    metadata,
  });

  if (insertError) {
    console.error("Public application insert error:", insertError);
    return { error: "Kunde inte skicka ansökan just nu. Försök igen." };
  }

  redirect(`/apply/${context.mandateId}?submitted=1`);
}

