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
