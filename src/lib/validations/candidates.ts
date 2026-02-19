import { z } from "zod";

export const submitCandidateSchema = z.object({
  first_name: z.string().min(1, "Ange förnamn"),
  last_name: z.string().min(1, "Ange efternamn"),
  email: z.string().email("Ange en giltig e-postadress").optional().or(z.literal("")),
  phone: z.string().optional(),
  linkedin_url: z
    .string()
    .url("Ange en giltig LinkedIn-URL")
    .optional()
    .or(z.literal("")),
  current_title: z.string().optional(),
  current_company: z.string().optional(),
  years_experience: z.number().min(0).max(60).optional(),
  expected_salary: z.number().min(0).optional(),
  cover_note: z.string().optional(),
  qualification_summary: z.string().min(20, "Beskriv varför kandidaten passar (minst 20 tecken)"),
});

export type SubmitCandidateInput = z.infer<typeof submitCandidateSchema>;
