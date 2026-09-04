// =============================================
// Job posting form options — all dropdown/select values
// =============================================

export const EMPLOYMENT_TYPE_OPTIONS = [
  "full_time",
  "part_time",
  "consultant",
  "contract",
  "freelance",
  "internship",
] as const;

// ponytail: launch scope is full-time only — restore types here when per-type pricing exists
export const ACTIVE_EMPLOYMENT_TYPE_OPTIONS = ["full_time"] as const;

// Maps employment_type DB key to the employment dict key
export const EMPLOYMENT_TYPE_DICT_KEY: Record<string, string> = {
  full_time: "fullTime",
  part_time: "partTime",
  consultant: "consultant",
  contract: "contract",
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
  "Accounting & Auditing",
  "Advertising, Marketing, Media & Broadcasting",
  "Agriculture & Agribusiness",
  "Automotive",
  "Aviation & Aerospace",
  "Banking & Financial Services",
  "Biotechnology",
  "BPO, Call Centers & Shared Services",
  "Chemicals",
  "Construction, Real Estate, Architecture & Infrastructure",
  "Consulting & Professional Services",
  "Education & Training",
  "Energy, Utilities & Environmental Services",
  "FMCG, Food & Beverage & Consumer Goods",
  "Furniture & Interior Design",
  "Government & Public Sector",
  "Healthcare, Wellness & Fitness",
  "Hospitality & Tourism",
  "Human Resources & Recruitment",
  "Insurance",
  "IT - Artificial Intelligence, Data & Analytics",
  "IT - Cybersecurity",
  "IT - Hardware & Electronics",
  "IT - Information Technology, Software, SaaS & IT Services",
  "Legal Services",
  "Logistics, Supply Chain & Transportation",
  "Manufacturing & Engineering",
  "Medical Devices",
  "Mining, Metals, Oil & Gas",
  "Nonprofit & NGO",
  "Pharmaceuticals",
  "Retail, Wholesale & E-commerce",
  "Telecommunications & Internet Services",
  "Textile, Leather, Apparel, Footwear & Home Textiles",
  "Other",
] as const;

export const REPORTING_TO_OPTIONS = [
  "No Reporting Required",
  "Supervisor",
  "Manager",
  "Senior Manager",
  "Team Lead",
  "Head / Head of Department",
  "Director",
  "Vice President (VP)",
  "Senior Vice President (SVP)",
  "Executive (C-Level: CEO, CTO, CFO, etc.)",
  "Founder / Owner",
] as const;

export const TEAM_SIZE_OPTIONS = [
  "No team management",
  "1 - 5",
  "6 - 10",
  "11 - 20",
  "21 - 50",
  "51 - 70",
  "71 - 100",
  "101 - 200",
  "201+",
] as const;

export const EXPERIENCE_BRACKET_OPTIONS = [
  "Fresh Graduate / No Experience",
  "0–1 year",
  "1–3 years",
  "3–5 years",
  "5–7 years",
  "7–10 years",
  "10–15 years",
  "15+ years",
] as const;

export const WORKING_HOURS_OPTIONS = [
  "Standard Business Hours",
  "Shift-Based",
  "Rotational Shifts",
  "Night Shift",
  "Weekend Shifts",
  "Split Shift (e.g., morning + evening)",
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
  "United States",
  "Canada",
  "United Arab Emirates",
  "Saudi Arabia",
  "India",
  "Singapore",
  "Australia",
  "South Africa",
  "Other",
] as const;

// Legacy: jobs created before the list switched to English stored Swedish names (plus the old "USA" label)
const LEGACY_COUNTRY_MAP: Record<string, string> = {
  Sverige: "Sweden",
  Norge: "Norway",
  Danmark: "Denmark",
  Tyskland: "Germany",
  "Nederländerna": "Netherlands",
  Storbritannien: "United Kingdom",
  Irland: "Ireland",
  Frankrike: "France",
  Spanien: "Spain",
  Italien: "Italy",
  Polen: "Poland",
  USA: "United States",
  Kanada: "Canada",
  "Förenade Arabemiraten": "United Arab Emirates",
  Saudiarabien: "Saudi Arabia",
  Indien: "India",
  Australien: "Australia",
  Sydafrika: "South Africa",
  "Övrigt": "Other",
};

export function normalizeCountry(value: string): string {
  return LEGACY_COUNTRY_MAP[value] ?? value;
}

// Legacy sector labels (the pre-2026-09-04 INDUSTRY_OPTIONS) mapped onto the
// current taxonomy, so rows saved under an old label still resolve to a value
// that IS in INDUSTRY_OPTIONS — the dropdown shows it selected instead of blank,
// and the job-fee industry lock still recognizes it. Read-time only; no
// migration. Unlisted / free-text values pass through unchanged.
const LEGACY_INDUSTRY_MAP: Record<string, string> = {
  "Agriculture": "Agriculture & Agribusiness",
  "Construction & Real Estate": "Construction, Real Estate, Architecture & Infrastructure",
  "Construction Materials & Infrastructure": "Construction, Real Estate, Architecture & Infrastructure",
  "Education": "Education & Training",
  "Energy & Utilities": "Energy, Utilities & Environmental Services",
  "Environmental Services": "Energy, Utilities & Environmental Services",
  "Financial Services": "Banking & Financial Services",
  "FMCG": "FMCG, Food & Beverage & Consumer Goods",
  "Healthcare": "Healthcare, Wellness & Fitness",
  "IT - Artificial Intelligence": "IT - Artificial Intelligence, Data & Analytics",
  "IT - SaaS / Software": "IT - Information Technology, Software, SaaS & IT Services",
  "IT - Services": "IT - Information Technology, Software, SaaS & IT Services",
  "Logistics & Transportation": "Logistics, Supply Chain & Transportation",
  "Manufacturing": "Manufacturing & Engineering",
  "Media & Entertainment": "Advertising, Marketing, Media & Broadcasting",
  "Mining & Metals": "Mining, Metals, Oil & Gas",
  "Oil & Gas": "Mining, Metals, Oil & Gas",
  "Pharmaceutical": "Pharmaceuticals",
  "Professional Services": "Consulting & Professional Services",
  "Retail & E-commerce": "Retail, Wholesale & E-commerce",
  "Telecommunications": "Telecommunications & Internet Services",
  "Textile & Apparel": "Textile, Leather, Apparel, Footwear & Home Textiles",
  "Others": "Other",
};

export function normalizeIndustry(value: string): string {
  return LEGACY_INDUSTRY_MAP[value] ?? value;
}
