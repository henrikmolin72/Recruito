// =============================================
// Job posting form options — all dropdown/select values
// =============================================

export const EMPLOYMENT_TYPE_OPTIONS = [
  "full_time",
  "part_time",
  "consultant",
  "freelance",
  "internship",
] as const;

// Maps employment_type DB key to the employment dict key
export const EMPLOYMENT_TYPE_DICT_KEY: Record<string, string> = {
  full_time: "fullTime",
  part_time: "partTime",
  consultant: "consultant",
  freelance: "freelance",
  internship: "internship",
};

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
  "company_car",
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
  { value: 1, label: "Nivå 1 – Flexibel" },
  { value: 2, label: "Nivå 2 – Prioriterad" },
  { value: 3, label: "Nivå 3 – Kritisk" },
] as const;

export const INDUSTRY_OPTIONS = [
  "Agriculture",
  "Automotive",
  "Aviation & Aerospace",
  "Biotechnology",
  "Chemicals",
  "Construction & Real Estate",
  "Construction Materials & Infrastructure",
  "Education",
  "Energy & Utilities",
  "Environmental Services",
  "Financial Services",
  "FMCG",
  "Government & Public Sector",
  "Healthcare",
  "Hospitality & Tourism",
  "Insurance",
  "IT - Artificial Intelligence",
  "IT - Cybersecurity",
  "IT - SaaS / Software",
  "IT - Services",
  "Legal Services",
  "Logistics & Transportation",
  "Manufacturing",
  "Media & Entertainment",
  "Medical Devices",
  "Mining & Metals",
  "Oil & Gas",
  "Pharmaceutical",
  "Professional Services",
  "Retail & E-commerce",
  "Telecommunications",
  "Textile & Apparel",
  "Others",
] as const;

export const COUNTRY_OPTIONS = [
  "Sverige",
  "Norge",
  "Danmark",
  "Finland",
  "Tyskland",
  "Nederländerna",
  "Storbritannien",
  "Irland",
  "Frankrike",
  "Spanien",
  "Italien",
  "Polen",
  "USA",
  "Kanada",
  "Förenade Arabemiraten",
  "Saudiarabien",
  "Indien",
  "Singapore",
  "Australien",
  "Sydafrika",
  "Övrigt",
] as const;
