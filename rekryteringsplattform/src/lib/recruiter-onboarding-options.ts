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

export const EXPERIENCE_BRACKET_OPTIONS = ["0-1", "2-3", "4-6", "7-10", "10+"] as const;

export const HOW_HEARD_OPTIONS = [
  "Google Search",
  "LinkedIn",
  "Referral from a colleague or friend",
  "Recruito Recruiter",
  "Online Advertisement",
  "Event or Conference",
  "Blog or Article",
  "Existing Customer",
] as const;

export const PRIMARY_INDUSTRY_OPTIONS = [
  "Technology",
  "Finance",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Energy",
  "Other",
] as const;

export const SENIORITY_FOCUS_OPTIONS = [
  "Junior",
  "Mid-Level",
  "Senior",
  "Executive/C-Level",
] as const;

export const AVERAGE_TIME_TO_FILL_OPTIONS = [
  "<1 week",
  "1-2 weeks",
  "2-4 weeks",
  "1-2 months",
  "2+ months",
] as const;

export const SOURCING_CHANNEL_OPTIONS = [
  "LinkedIn",
  "Indeed",
  "Other Job Boards",
  "Internal Database",
  "Personal Network",
  "Headhunting / Direct Outreach",
  "Social Media",
  "Referrals",
] as const;

export const AVAILABLE_HOURS_OPTIONS = ["0-10", "10-20", "20-40", "40+"] as const;

export const LANGUAGE_PROFICIENCY_OPTIONS = [
  "Basic",
  "Conversational",
  "Professional",
  "Native/Bilingual",
] as const;

export function mapExperienceBracketToYears(value: string | null): number | null {
  if (!value) return null;
  const map: Record<string, number> = {
    "0-1": 0,
    "2-3": 2,
    "4-6": 4,
    "7-10": 7,
    "10+": 10,
  };
  return map[value] ?? null;
}
