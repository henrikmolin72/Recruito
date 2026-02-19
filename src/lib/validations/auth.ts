import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ange en giltig e-postadress"),
  password: z.string().min(8, "Lösenordet måste vara minst 8 tecken"),
});

export const registerCompanySchema = z.object({
  email: z.string().email("Ange en giltig e-postadress"),
  password: z.string().min(8, "Lösenordet måste vara minst 8 tecken"),
  full_name: z.string().min(2, "Ange ditt namn"),
  company_name: z.string().min(2, "Ange företagsnamn"),
  org_number: z.string().optional(),
  industry: z.string().min(1, "Välj bransch"),
  city: z.string().min(1, "Ange stad"),
});

export const registerRecruiterSchema = z.object({
  email: z.string().email("Ange en giltig e-postadress"),
  password: z.string().min(8, "Lösenordet måste vara minst 8 tecken"),
  full_name: z.string().min(2, "Ange ditt namn"),
  headline: z.string().min(10, "Beskriv din expertis kort (minst 10 tecken)"),
  specializations: z.array(z.string()).min(1, "Välj minst en specialisering"),
  years_experience: z.number().min(0).max(50),
  linkedin_url: z
    .string()
    .url("Ange en giltig LinkedIn-URL")
    .optional()
    .or(z.literal("")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;
export type RegisterRecruiterInput = z.infer<typeof registerRecruiterSchema>;
