"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { verifyCvFileContent } from "@/lib/file-magic";

export type PublicApplicationFormState = {
  error?: string;
};

const MAX_CV_TEXT_LENGTH = 40_000;
const MAX_COVER_LETTER_LENGTH = 10_000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_CV_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt", "rtf"]);
const ALLOWED_CV_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/rtf",
  "text/rtf",
]);

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
  companyLogoUrl: string | null;
  companyWebsite: string | null;
  screeningQuestions: string[];
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
    location: [job.city, job.country].filter(Boolean).join(", ") || null,
    companyName: company?.company_name ?? null,
    companyLogoUrl: company?.logo_url ?? null,
    companyWebsite: company?.website ?? null,
    screeningQuestions: Array.isArray(job.screening_questions) ? job.screening_questions : [],
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
        city,
        country,
        status,
        screening_questions,
        company:companies (company_name, logo_url, website)
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

function getFileExtension(name: string) {
  const ext = name.split(".").pop()?.trim().toLowerCase();
  return ext || "";
}

function isAllowedCvFile(file: File) {
  const ext = getFileExtension(file.name || "");
  const mime = (file.type || "").toLowerCase();

  const extensionAllowed = !!ext && ALLOWED_CV_EXTENSIONS.has(ext);
  const mimeAllowed = ALLOWED_CV_MIME_TYPES.has(mime);

  return extensionAllowed && mimeAllowed;
}

function getClientIp(headerStore: { get(name: string): string | null }) {
  const forwardedFor = headerStore.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headerStore.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

export async function submitPublicMandateApplication(
  _prevState: PublicApplicationFormState,
  formData: FormData
): Promise<PublicApplicationFormState> {
  const headerStore = await headers();
  const clientIp = getClientIp(headerStore);

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

  const applyRateLimit = await consumeRateLimit({
    key: `public-apply:ip:${clientIp}`,
    limit: 12,
    windowMs: 60 * 60 * 1000,
  });
  if (!applyRateLimit.allowed) {
    return {
      error: `För många ansökningar från samma nätverk just nu. Försök igen om ${applyRateLimit.retryAfterSeconds} sekunder.`,
    };
  }

  const consentGiven = formData.get("consent_given") === "on" || formData.get("consent_given") === "true";
  if (!consentGiven) {
    return { error: "Du måste godkänna att dina uppgifter delas med rekryteraren och uppdragsgivaren." };
  }

  const context = await getPublicMandateApplicationContext(parsed.data.mandate_id);
  if (!context || !context.isActive || context.jobStatus !== "active") {
    return { error: "Den här ansökningslänken är inte aktiv längre." };
  }

  // Parse screening answers from form — constrained to valid question indices only
  const screeningAnswers: Record<string, string> = {};
  const maxScreeningIdx = context.screeningQuestions.length;
  for (let i = 0; i < maxScreeningIdx; i++) {
    const raw = formData.get(`screening_${i}`);
    if (typeof raw === "string" && raw.trim()) {
      screeningAnswers[String(i)] = raw.trim().slice(0, 5000);
    }
  }

  const admin = createAdminClient();

  // Duplicate detection: check by email or LinkedIn for same job
  // Uses lowercased values to match the unique indexes (lower(email), lower(linkedin_url))
  const normalizedEmail = parsed.data.email?.toLowerCase() ?? null;
  const normalizedLinkedin = parsed.data.linkedin_url?.toLowerCase() ?? null;

  if (normalizedEmail) {
    const { data: existing } = await admin
      .from("applications")
      .select("id")
      .eq("job_id", context.jobId)
      .eq("email", normalizedEmail)
      .limit(1);
    if (existing && existing.length > 0) {
      return { error: "En ansökan med denna e-postadress finns redan för denna tjänst." };
    }
  }

  if (normalizedLinkedin) {
    const { data: existing } = await admin
      .from("applications")
      .select("id")
      .eq("job_id", context.jobId)
      .eq("linkedin_url", normalizedLinkedin)
      .limit(1);
    if (existing && existing.length > 0) {
      return { error: "En ansökan med denna LinkedIn-profil finns redan för denna tjänst." };
    }
  }

  let cvFilePath: string | null = null;
  const cvFile = formData.get("cv_file");
  if (cvFile instanceof File && cvFile.size > 0) {
    if (cvFile.size > MAX_FILE_SIZE) {
      return { error: "CV-filen får max vara 10 MB." };
    }

    if (!isAllowedCvFile(cvFile)) {
      return { error: "Tillåtna filtyper för CV är PDF, DOC, DOCX, TXT eller RTF." };
    }

    // Magic-byte content check: file.type and extension are client-controlled
    if (!(await verifyCvFileContent(cvFile, getFileExtension(cvFile.name)))) {
      return { error: "Filinnehåll matchar inte filtypen. Ladda upp en giltig CV-fil." };
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
    email: normalizedEmail,
    phone: parsed.data.phone,
    linkedin_url: normalizedLinkedin,
    cv_text: parsed.data.cv_text,
    cover_letter_text: parsed.data.cover_letter_text,
    screening_answers: Object.keys(screeningAnswers).length > 0 ? screeningAnswers : null,
    consent_given: true,
    cv_file_path: cvFilePath,
    source: "public_apply_link",
    status: "new",
    metadata,
  });

  if (insertError) {
    // Handle unique constraint violation (race condition on duplicate)
    if (insertError.code === "23505") {
      return { error: "En ansökan med dessa uppgifter finns redan för denna tjänst." };
    }
    console.error("Public application insert error:", insertError);
    return { error: "Kunde inte skicka ansökan just nu. Försök igen." };
  }

  redirect(`/apply/${context.mandateId}?submitted=1`);
}

// ─── Recruiter review actions ───────────────────────────────────────────────

const MAX_SUBMISSIONS_PER_MANDATE = 7;

export async function reviewApplication(
  applicationId: string,
  action: "approve" | "reject",
  recruiterId: string
): Promise<{ success: boolean; error?: string }> {
  // Authenticate the caller and bind the action to their own recruiter row.
  // recruiterId is caller-supplied, so without this an attacker could act as
  // any recruiter by passing someone else's id (CLAUDE.md §6: auth + IDOR).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Du måste vara inloggad." };

  const admin = createAdminClient();

  const { data: recruiter } = await admin
    .from("recruiters")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!recruiter || recruiter.id !== recruiterId) {
    return { success: false, error: "Behörighet saknas." };
  }

  if (action === "approve") {
    // Use atomic Postgres function to prevent race condition on max-7 limit
    const { data, error: rpcError } = await admin.rpc("approve_application", {
      p_application_id: applicationId,
      p_recruiter_id: recruiterId,
      p_max_submissions: MAX_SUBMISSIONS_PER_MANDATE,
    });

    if (rpcError) {
      console.error("Error calling approve_application RPC:", rpcError);
      return { success: false, error: "Kunde inte godkänna ansökan." };
    }

    const result = data as { ok: boolean; error?: string };
    if (!result?.ok) {
      const errorMessages: Record<string, string> = {
        not_found: "Ansökan hittades inte eller tillhör inte dig.",
        already_reviewed: "Ansökan har redan granskats.",
        limit_reached: `Du kan max skicka ${MAX_SUBMISSIONS_PER_MANDATE} kandidater till kunden. Avslå några innan du skickar fler.`,
      };
      return { success: false, error: errorMessages[result?.error ?? ""] || "Kunde inte godkänna ansökan." };
    }
  } else {
    // Use atomic Postgres function for rejection too
    const { data, error: rpcError } = await admin.rpc("reject_application", {
      p_application_id: applicationId,
      p_recruiter_id: recruiterId,
    });

    if (rpcError) {
      console.error("Error calling reject_application RPC:", rpcError);
      return { success: false, error: "Kunde inte avslå ansökan." };
    }

    const result = data as { ok: boolean; error?: string };
    if (!result?.ok) {
      const errorMessages: Record<string, string> = {
        not_found: "Ansökan hittades inte eller tillhör inte dig.",
        already_reviewed: "Ansökan har redan granskats.",
      };
      return { success: false, error: errorMessages[result?.error ?? ""] || "Kunde inte avslå ansökan." };
    }
  }

  return { success: true };
}
