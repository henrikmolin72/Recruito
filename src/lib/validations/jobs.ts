import { z } from "zod";

export const createJobSchema = z.object({
  title: z.string().min(3, "Ange en jobbtitel (minst 3 tecken)"),
  description: z.string().min(50, "Beskriv tjänsten mer detaljerat (minst 50 tecken)"),
  requirements: z.string().min(20, "Ange krav för tjänsten (minst 20 tecken)"),
  nice_to_have: z.string().optional(),
  industry: z.string().min(1, "Välj bransch"),
  location: z.string().min(1, "Välj plats"),
  employment_type: z.string().default("Heltid"),
  remote_policy: z.string().optional(),
  salary_min: z.number().min(0).optional(),
  salary_max: z.number().min(0).optional(),
  fee_percentage: z.number().min(5).max(25).default(15),
  max_recruiters: z.number().min(1).max(10).default(5),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

export const updateJobSchema = createJobSchema.partial();
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
