import { z } from "zod";

const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

const requiredText = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} måste vara minst ${min} tecken`)
    .max(max, `${label} får max vara ${max} tecken`);

const optionalEmail = z
  .union([z.string().trim().email("Ogiltig e-postadress"), z.literal("")])
  .transform((value) => (value ? value : null));

const optionalUrl = z
  .union([z.string().trim().url("Ogiltig URL"), z.literal("")])
  .transform((value) => (value ? value : null));

const optionalInteger = (min: number, max: number) =>
  z
    .union([z.number().int().min(min).max(max), z.null()])
    .nullable();

const toString = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

const toOptionalInt = (value: FormDataEntryValue | null) => {
  const raw = toString(value).trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
};

const toOptionalFloat = (value: FormDataEntryValue | null) => {
  const raw = toString(value).trim();
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
};

function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.message || "Ogiltig inmatning";
}

const loginSchema = z.object({
  email: z.string().trim().email("Ogiltig e-postadress").max(EMAIL_MAX_LENGTH),
  password: z
    .string()
    .min(1, "Lösenord krävs")
    .max(PASSWORD_MAX_LENGTH, `Lösenord får max vara ${PASSWORD_MAX_LENGTH} tecken`),
});

export function validateLoginForm(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: toString(formData.get("email")),
    password: toString(formData.get("password")),
  });

  if (!parsed.success) {
    return { success: false as const, error: firstError(parsed.error) };
  }

  return { success: true as const, data: parsed.data };
}

const passwordResetRequestSchema = z.object({
  email: z.string().trim().email("Ogiltig e-postadress").max(EMAIL_MAX_LENGTH),
});

export function validatePasswordResetRequestForm(formData: FormData) {
  const parsed = passwordResetRequestSchema.safeParse({
    email: toString(formData.get("email")),
  });

  if (!parsed.success) {
    return { success: false as const, error: firstError(parsed.error) };
  }

  return { success: true as const, data: parsed.data };
}

const registerCompanySchema = z.object({
  email: z.string().trim().email("Ogiltig e-postadress").max(EMAIL_MAX_LENGTH),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Lösenord måste vara minst ${PASSWORD_MIN_LENGTH} tecken`)
    .max(PASSWORD_MAX_LENGTH, `Lösenord får max vara ${PASSWORD_MAX_LENGTH} tecken`),
  full_name: requiredText("Kontaktperson", 2, 100),
  company_name: requiredText("Företagsnamn", 2, 120),
  org_number: optionalText(32),
  industry: optionalText(80),
});

export function validateRegisterCompanyForm(formData: FormData) {
  const parsed = registerCompanySchema.safeParse({
    email: toString(formData.get("email")),
    password: toString(formData.get("password")),
    full_name: toString(formData.get("full_name")),
    company_name: toString(formData.get("company_name")),
    org_number: toString(formData.get("org_number")),
    industry: toString(formData.get("industry")),
  });

  if (!parsed.success) {
    return { success: false as const, error: firstError(parsed.error) };
  }

  return { success: true as const, data: parsed.data };
}

const registerRecruiterSchema = z.object({
  email: z.string().trim().email("Ogiltig e-postadress").max(EMAIL_MAX_LENGTH),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Lösenord måste vara minst ${PASSWORD_MIN_LENGTH} tecken`)
    .max(PASSWORD_MAX_LENGTH, `Lösenord får max vara ${PASSWORD_MAX_LENGTH} tecken`),
  full_name: requiredText("Namn", 2, 100),
  headline: optionalText(140),
  linkedin_url: optionalUrl,
  years_experience: optionalInteger(0, 60),
});

export function validateRegisterRecruiterForm(formData: FormData) {
  const parsed = registerRecruiterSchema.safeParse({
    email: toString(formData.get("email")),
    password: toString(formData.get("password")),
    full_name: toString(formData.get("full_name")),
    headline: toString(formData.get("headline")),
    linkedin_url: toString(formData.get("linkedin_url")),
    years_experience: toOptionalInt(formData.get("years_experience")),
  });

  if (!parsed.success) {
    return { success: false as const, error: firstError(parsed.error) };
  }

  return { success: true as const, data: parsed.data };
}

const jobSchema = z
  .object({
    title: requiredText("Titel", 3, 150),
    description: requiredText("Beskrivning", 20, 10000),
    location: requiredText("Plats", 2, 120),
    industry: requiredText("Bransch", 2, 80),
    employment_type: requiredText("Anställningsform", 2, 40),
    salary_min: optionalInteger(0, 10_000_000),
    salary_max: optionalInteger(0, 10_000_000),
    salary_currency: z
      .string()
      .trim()
      .min(3, "Valuta krävs")
      .max(5, "Ogiltig valuta"),
    fee_percentage: z
      .number()
      .min(1, "Arvode måste vara minst 1%")
      .max(50, "Arvode får max vara 50%")
      .optional()
      .default(15),
    max_recruiters: z
      .number()
      .int()
      .min(1, "Minst 1 rekryterare")
      .max(10, "Max 10 rekryterare"),
  })
  .refine(
    (data) =>
      data.salary_min === null ||
      data.salary_max === null ||
      data.salary_max >= data.salary_min,
    {
      message: "Maxlön måste vara större än eller lika med minlön",
      path: ["salary_max"],
    }
  );

export function validateJobForm(formData: FormData) {
  const parsed = jobSchema.safeParse({
    title: toString(formData.get("title")),
    description: toString(formData.get("description")),
    location: toString(formData.get("location")),
    industry: toString(formData.get("industry")),
    employment_type: toString(formData.get("employment_type")),
    salary_min: toOptionalInt(formData.get("salary_min")),
    salary_max: toOptionalInt(formData.get("salary_max")),
    salary_currency: toString(formData.get("salary_currency")) || "SEK",
    fee_percentage: toOptionalFloat(formData.get("fee_percentage")) ?? undefined,
    max_recruiters: toOptionalInt(formData.get("max_recruiters")) ?? Number.NaN,
  });

  if (!parsed.success) {
    return { success: false as const, error: firstError(parsed.error) };
  }

  return { success: true as const, data: parsed.data };
}

const candidateSchema = z.object({
  first_name: requiredText("Förnamn", 1, 80),
  last_name: requiredText("Efternamn", 1, 80),
  email: z.string().trim().email("Ogiltig e-postadress").max(EMAIL_MAX_LENGTH),
  phone: optionalText(40),
  linkedin_url: optionalUrl,
  current_title: optionalText(120),
  current_company: optionalText(120),
  years_experience: optionalInteger(0, 60),
  expected_salary: optionalInteger(0, 10_000_000),
  cover_note: optionalText(5000),
  cv_file: z
    .instanceof(File, { message: "CV-fil krävs" })
    .refine((file) => file.size > 0, "CV-fil krävs")
    .refine((file) => file.size <= 10 * 1024 * 1024, "CV-filen får max vara 10 MB"),
});

export function validateCandidateForm(formData: FormData) {
  const cvFile = formData.get("cv_file");
  const parsed = candidateSchema.safeParse({
    first_name: toString(formData.get("first_name")),
    last_name: toString(formData.get("last_name")),
    email: toString(formData.get("email")),
    phone: toString(formData.get("phone")),
    linkedin_url: toString(formData.get("linkedin_url")),
    current_title: toString(formData.get("current_title")),
    current_company: toString(formData.get("current_company")),
    years_experience: toOptionalInt(formData.get("years_experience")),
    expected_salary: toOptionalInt(formData.get("expected_salary")),
    cover_note: toString(formData.get("cover_note")),
    cv_file: cvFile instanceof File ? cvFile : null,
  });

  if (!parsed.success) {
    return { success: false as const, error: firstError(parsed.error) };
  }

  return { success: true as const, data: parsed.data };
}

const companyProfileSchema = z.object({
  company_name: requiredText("Företagsnamn", 2, 120),
  org_number: optionalText(32),
  description: optionalText(5000),
  city: optionalText(120),
  industry: optionalText(80),
  website: optionalUrl,
  contact_name: optionalText(100),
  contact_email: optionalEmail,
});

export function validateCompanyProfileForm(formData: FormData) {
  const parsed = companyProfileSchema.safeParse({
    company_name: toString(formData.get("company_name")),
    org_number: toString(formData.get("org_number")),
    description: toString(formData.get("description")),
    city: toString(formData.get("city")),
    industry: toString(formData.get("industry")),
    website: toString(formData.get("website")),
    contact_name: toString(formData.get("contact_name")),
    contact_email: toString(formData.get("contact_email")),
  });

  if (!parsed.success) {
    return { success: false as const, error: firstError(parsed.error) };
  }

  return { success: true as const, data: parsed.data };
}

const recruiterProfileSchema = z.object({
  full_name: optionalText(100),
  phone: optionalText(40),
  headline: optionalText(140),
  bio: optionalText(5000),
  linkedin_url: optionalUrl,
});

export function validateRecruiterProfileForm(formData: FormData) {
  const parsed = recruiterProfileSchema.safeParse({
    full_name: toString(formData.get("full_name")),
    phone: toString(formData.get("phone")),
    headline: toString(formData.get("headline")),
    bio: toString(formData.get("bio")),
    linkedin_url: toString(formData.get("linkedin_url")),
  });

  if (!parsed.success) {
    return { success: false as const, error: firstError(parsed.error) };
  }

  return { success: true as const, data: parsed.data };
}
