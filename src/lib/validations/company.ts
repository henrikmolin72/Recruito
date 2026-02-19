import { z } from "zod";

export const updateCompanySchema = z.object({
  company_name: z.string().min(2, "Ange företagsnamn"),
  org_number: z.string().optional(),
  description: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url("Ange en giltig webbadress").optional().or(z.literal("")),
  city: z.string().optional(),
  country: z.enum(["SE", "NO", "DK"]).default("SE"),
  employee_count: z.string().optional(),
  billing_email: z.string().email("Ange en giltig e-postadress").optional().or(z.literal("")),
  billing_address: z.string().optional(),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const EMPLOYEE_COUNT_OPTIONS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "500+",
] as const;

export const COUNTRY_OPTIONS = [
  { value: "SE", label: "Sverige" },
  { value: "NO", label: "Norge" },
  { value: "DK", label: "Danmark" },
] as const;
