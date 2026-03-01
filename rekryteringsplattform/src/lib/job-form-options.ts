// =============================================
// Job posting form options — all dropdown/select values
// =============================================

export const EMPLOYMENT_TYPE_OPTIONS = [
  "Heltid",
  "Deltid",
  "Konsult",
  "Frilans",
  "Praktik",
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
