// =============================================
// Job posting form options — all dropdown/select values
// =============================================

export const EMPLOYMENT_TYPE_OPTIONS = [
  "Full-time",
  "Part-time",
  "Consultant",
  "Freelance",
  "Internship",
  "Fix Term Contract",
] as const;

export const WORK_TYPE_OPTIONS = [
  "onsite",
  "hybrid",
  "remote",
] as const;

export const REMOTE_TYPE_OPTIONS = [
  "local",
  "international",
] as const;

export const SALARY_GROSS_NET_OPTIONS = [
  "gross",
  "net",
] as const;

export const SALARY_PERIOD_OPTIONS = [
  "monthly",
  "yearly",
  "hourly",
] as const;

export const SALARY_CURRENCY_OPTIONS = [
  "SEK",
  "EUR",
  "USD",
  "NOK",
  "DKK",
  "GBP",
] as const;

export const BENEFITS_OPTIONS = [
  "bonus",
  "meal_vouchers",
  "health_insurance",
  "pension",
  "profit_sharing",
  "stock_options",
  "relocation_package",
] as const;

export const POSITION_TYPE_OPTIONS = [
  "new",
  "replacement",
] as const;

export const LANGUAGE_LEVEL_OPTIONS = [
  "basic",
  "intermediate",
  "advanced",
  "fluent",
  "native",
] as const;

export const INTERVIEW_TYPE_OPTIONS = [
  "online",
  "onsite",
  "both",
] as const;

export const EUROPEAN_LANGUAGE_OPTIONS = [
  "English",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "German",
  "French",
  "Spanish",
  "Italian",
  "Dutch",
  "Polish",
  "Portuguese",
  "Czech",
  "Romanian",
  "Hungarian",
  "Greek",
  "Bulgarian",
  "Croatian",
  "Slovak",
  "Slovenian",
  "Lithuanian",
  "Latvian",
  "Estonian",
] as const;

export const SHIFT_WORK_OPTIONS = [
  "no",
  "yes",
  "rotating",
] as const;

export const URGENCY_LEVEL_OPTIONS = [
  { value: 1, label: "Level 1 – Flexible" },
  { value: 2, label: "Level 2 – Prioritized" },
  { value: 3, label: "Level 3 – Critical" },
] as const;

export const COUNTRY_OPTIONS = [
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Germany",
  "Netherlands",
  "United Kingdom",
  "Ireland",
  "France",
  "Spain",
  "Italy",
  "Poland",
  "USA",
  "Canada",
  "United Arab Emirates",
  "Saudi Arabia",
  "India",
  "Singapore",
  "Australia",
  "South Africa",
  "Other",
] as const;

export const INDUSTRY_OPTIONS = [
  "IT & Software",
  "Finance & Banking",
  "Healthcare & Life Sciences",
  "Manufacturing",
  "Retail & E-commerce",
  "Energy & Utilities",
  "Telecommunications",
  "Construction & Real Estate",
  "Education",
  "Consulting & Professional Services",
  "Logistics & Transportation",
  "Media & Entertainment",
  "Government & Public Sector",
  "Automotive",
  "Hospitality & Tourism",
  "Legal",
  "Agriculture & Food",
  "Other",
] as const;

export const JOB_POST_TYPE_OPTIONS = [
  { value: "exclusive", label: "Exclusive – on Recruito only", discount: 10 },
  { value: "standard", label: "Standard – posting on multiple sites", discount: 0 },
] as const;
