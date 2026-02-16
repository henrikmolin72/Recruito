import { z } from "zod";

export const createJobSchema = z.object({
  title: z.string().min(5, "Titeln måste vara minst 5 tecken"),
  description: z.string().min(50, "Beskrivningen måste vara minst 50 tecken"),
  requirements: z.string().optional(),
  nice_to_have: z.string().optional(),
  industry: z.string().min(1, "Välj bransch"),
  location: z.string().min(1, "Välj plats"),
  employment_type: z.string().min(1, "Välj anställningstyp"),
  remote_policy: z.string().optional(),
  salary_min: z.number().min(0).optional(),
  salary_max: z.number().min(0).optional(),
  fee_percentage: z.number().min(5).max(25),
  max_recruiters: z.number().min(1).max(10),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

export const submitCandidateSchema = z.object({
  first_name: z.string().min(1, "Ange förnamn"),
  last_name: z.string().min(1, "Ange efternamn"),
  email: z.string().email("Ange giltig e-post").optional().or(z.literal("")),
  phone: z.string().optional(),
  linkedin_url: z.string().url("Ange giltig URL").optional().or(z.literal("")),
  current_title: z.string().optional(),
  current_company: z.string().optional(),
  years_experience: z.number().min(0).max(50).optional(),
  expected_salary: z.number().min(0).optional(),
  cover_note: z.string().min(20, "Motivera varför kandidaten är rätt (minst 20 tecken)"),
  qualification_summary: z.string().optional(),
});

export type SubmitCandidateInput = z.infer<typeof submitCandidateSchema>;
