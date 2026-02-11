"use server";

import { createClient } from "@/lib/supabase/server";

interface Recruiter {
  id: string;
  specializations: string[] | null;
  locations: string[] | null;
  years_experience: number | null;
  total_placements: number | null;
  rating: number | null;
  [key: string]: unknown;
}

interface Job {
  id: string;
  industry: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  employment_type: string | null;
  fee_percentage: number | null;
  [key: string]: unknown;
}

interface MatchResult {
  score: number;
  reasons: string[];
}

export async function calculateMatchScore(
  recruiter: Recruiter,
  job: Job
): Promise<MatchResult> {
  const reasons: string[] = [];
  let score = 0;

  // --- Specialization match (0-35 pts) ---
  const specializations = recruiter.specializations ?? [];
  const jobIndustry = job.industry ?? "";

  if (jobIndustry && specializations.length > 0) {
    const normalizedIndustry = jobIndustry.toLowerCase().trim();
    const hasMatch = specializations.some(
      (spec) => spec.toLowerCase().trim() === normalizedIndustry
    );
    if (hasMatch) {
      score += 35;
      reasons.push(`Specialisering matchar: ${jobIndustry}`);
    } else {
      // Partial match: check if any specialization partially overlaps
      const hasPartial = specializations.some(
        (spec) =>
          normalizedIndustry.includes(spec.toLowerCase().trim()) ||
          spec.toLowerCase().trim().includes(normalizedIndustry)
      );
      if (hasPartial) {
        score += 15;
        reasons.push(`Delvis matchning inom bransch: ${jobIndustry}`);
      }
    }
  }

  // --- Location match (0-25 pts) ---
  const recruiterLocations = recruiter.locations ?? [];
  const jobLocation = job.location ?? "";

  if (jobLocation && recruiterLocations.length > 0) {
    const normalizedJobLocation = jobLocation.toLowerCase().trim();
    const hasExactLocation = recruiterLocations.some(
      (loc) => loc.toLowerCase().trim() === normalizedJobLocation
    );
    const hasRemote = recruiterLocations.some(
      (loc) => loc.toLowerCase().trim() === "remote"
    );
    const jobIsRemote = normalizedJobLocation === "remote";

    if (hasExactLocation) {
      score += 25;
      reasons.push(`Plats matchar: ${jobLocation}`);
    } else if (hasRemote || jobIsRemote) {
      score += 20;
      reasons.push("Distansarbete tillgängligt");
    }
  }

  // --- Experience level (0-20 pts) ---
  const yearsExperience = recruiter.years_experience ?? 0;

  if (yearsExperience > 0) {
    // Linear scale: 2 pts per year, max 20 at 10+ years
    const experienceScore = Math.min(yearsExperience * 2, 20);
    score += experienceScore;

    if (yearsExperience >= 10) {
      reasons.push(`Senior rekryterare med ${yearsExperience} års erfarenhet`);
    } else if (yearsExperience >= 5) {
      reasons.push(`Erfaren rekryterare med ${yearsExperience} års erfarenhet`);
    } else {
      reasons.push(`${yearsExperience} års erfarenhet`);
    }
  }

  // --- Track record (0-20 pts) ---
  const totalPlacements = recruiter.total_placements ?? 0;
  const rating = recruiter.rating ?? 0;

  // Placements: up to 10 pts (1 pt per placement, max 10)
  const placementScore = Math.min(totalPlacements, 10);
  score += placementScore;

  // Rating: up to 10 pts (rating * 2)
  const ratingScore = Math.min(Math.round(rating * 2), 10);
  score += ratingScore;

  if (totalPlacements > 0 || rating > 0) {
    const parts: string[] = [];
    if (totalPlacements > 0) {
      parts.push(`${totalPlacements} genomförda placeringar`);
    }
    if (rating > 0) {
      parts.push(`${rating.toFixed(1)} i betyg`);
    }
    reasons.push(parts.join(", "));
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  return { score, reasons };
}

export async function getMatchedJobsForRecruiter(
  recruiterId: string
): Promise<{ job: Record<string, unknown>; score: number; reasons: string[] }[]> {
  const supabase = await createClient();

  // Fetch the recruiter
  const { data: recruiter, error: recruiterError } = await supabase
    .from("recruiters")
    .select("*")
    .eq("id", recruiterId)
    .single();

  if (recruiterError || !recruiter) {
    return [];
  }

  // Fetch active jobs
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("*, companies(company_name)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (jobsError || !jobs) {
    return [];
  }

  // Calculate scores for each job
  const results = await Promise.all(
    jobs.map(async (job) => {
      const { score, reasons } = await calculateMatchScore(
        recruiter as Recruiter,
        job as Job
      );
      return { job, score, reasons };
    })
  );

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

export async function getMatchedRecruitersForJob(
  jobId: string
): Promise<{ recruiter: Record<string, unknown>; score: number; reasons: string[] }[]> {
  const supabase = await createClient();

  // Fetch the job
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*, companies(company_name)")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return [];
  }

  // Fetch approved recruiters
  const { data: recruiters, error: recruitersError } = await supabase
    .from("recruiters")
    .select("*, profiles(full_name, avatar_url)")
    .eq("approval_status", "approved");

  if (recruitersError || !recruiters) {
    return [];
  }

  // Calculate scores for each recruiter
  const results = await Promise.all(
    recruiters.map(async (recruiter) => {
      const { score, reasons } = await calculateMatchScore(
        recruiter as Recruiter,
        job as Job
      );
      return { recruiter, score, reasons };
    })
  );

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}
