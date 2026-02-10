import { z } from "zod";

export const submitCandidateSchema = z.object({
  first_name: z.string().min(1, "Ange förnamn"),
  last_name: z.string().min(1, "Ange efternamn"),
  email: z.string().email("Ange giltig e-post").optional().or(z.literal("")),
  phone: z.string().optional(),
  linkedin_url: z.string().url().optional().or(z.literal("")),
  current_title: z.string().min(1, "Ange nuvarande titel"),
  current_company: z.string().optional(),
  years_experience: z.number().min(0),
  expected_salary: z.number().min(0).optional(),
  cover_note: z.string().min(20, "Skriv en kort presentation av kandidaten"),
  qualification_summary: z.string().min(20, "Beskriv varför kandidaten passar"),
});

export type SubmitCandidateInput = z.infer<typeof submitCandidateSchema>;
