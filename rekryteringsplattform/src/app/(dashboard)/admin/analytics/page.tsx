import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatsCard } from "@/components/dashboard/stats-card";
import { TrendCard } from "@/components/analytics/trend-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Award,
  Briefcase,
  Clock,
  TrendingUp,
  UserSearch,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Swedish month names for display
const SWEDISH_MONTHS = [
  "Januari",
  "Februari",
  "Mars",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Augusti",
  "September",
  "Oktober",
  "November",
  "December",
];

function getMonthLabel(date: Date): string {
  return `${SWEDISH_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/login");

  // ── Section A: Platform KPIs ──────────────────────────────────────────

  // Total revenue
  const { data: revenueData } = await supabase
    .from("placements")
    .select("platform_fee");

  const totalRevenue =
    revenueData?.reduce((sum, p) => sum + (p.platform_fee || 0), 0) ?? 0;

  // Total placements
  const { count: totalPlacements } = await supabase
    .from("placements")
    .select("*", { count: "exact", head: true });

  // Active jobs
  const { count: activeJobs } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  // Avg time-to-fill (published_at -> filled_at)
  const { data: filledJobs } = await supabase
    .from("jobs")
    .select("published_at, filled_at")
    .not("published_at", "is", null)
    .not("filled_at", "is", null);

  let avgTimeToFill = 0;
  if (filledJobs && filledJobs.length > 0) {
    const totalDays = filledJobs.reduce((sum, job) => {
      const diff =
        new Date(job.filled_at).getTime() -
        new Date(job.published_at).getTime();
      return sum + diff / (1000 * 60 * 60 * 24);
    }, 0);
    avgTimeToFill = Math.round(totalDays / filledJobs.length);
  }

  // Conversion rate (placements / total candidates * 100)
  const { count: totalCandidates } = await supabase
    .from("candidates")
    .select("*", { count: "exact", head: true });

  const conversionRate =
    totalCandidates && totalCandidates > 0
      ? ((totalPlacements ?? 0) / totalCandidates * 100).toFixed(1)
      : "0";

  // Active recruiters
  const { count: activeRecruiters } = await supabase
    .from("recruiters")
    .select("*", { count: "exact", head: true })
    .eq("approval_status", "approved");

  // ── Section B: Industry Benchmarks ────────────────────────────────────

  const { data: allJobs } = await supabase
    .from("jobs")
    .select("id, industry, salary_min, salary_max, fee_percentage, published_at, filled_at, status");

  const { data: allPlacements } = await supabase
    .from("placements")
    .select("id, job_id, total_fee, platform_fee, recruiter_fee, annual_salary, created_at, start_date, status");

  // Build industry benchmark map
  const industryMap = new Map<
    string,
    {
      jobs: number;
      totalSalary: number;
      salaryCount: number;
      totalFee: number;
      feeCount: number;
      totalTimeToFill: number;
      fillTimeCount: number;
      placements: number;
    }
  >();

  if (allJobs) {
    for (const job of allJobs) {
      const industry = job.industry || "Övrigt";
      if (!industryMap.has(industry)) {
        industryMap.set(industry, {
          jobs: 0,
          totalSalary: 0,
          salaryCount: 0,
          totalFee: 0,
          feeCount: 0,
          totalTimeToFill: 0,
          fillTimeCount: 0,
          placements: 0,
        });
      }
      const entry = industryMap.get(industry)!;
      entry.jobs++;

      const avgSalary =
        job.salary_min && job.salary_max
          ? (job.salary_min + job.salary_max) / 2
          : job.salary_min || job.salary_max || 0;
      if (avgSalary > 0) {
        entry.totalSalary += avgSalary;
        entry.salaryCount++;
      }

      if (job.fee_percentage) {
        entry.totalFee += job.fee_percentage;
        entry.feeCount++;
      }

      if (job.published_at && job.filled_at) {
        const diff =
          new Date(job.filled_at).getTime() -
          new Date(job.published_at).getTime();
        entry.totalTimeToFill += diff / (1000 * 60 * 60 * 24);
        entry.fillTimeCount++;
      }
    }
  }

  // Count placements per industry (via job_id -> job.industry)
  const jobIndustryLookup = new Map<string, string>();
  if (allJobs) {
    for (const job of allJobs) {
      jobIndustryLookup.set(job.id, job.industry || "Övrigt");
    }
  }

  if (allPlacements) {
    for (const placement of allPlacements) {
      const industry = jobIndustryLookup.get(placement.job_id) || "Övrigt";
      if (!industryMap.has(industry)) {
        industryMap.set(industry, {
          jobs: 0,
          totalSalary: 0,
          salaryCount: 0,
          totalFee: 0,
          feeCount: 0,
          totalTimeToFill: 0,
          fillTimeCount: 0,
          placements: 0,
        });
      }
      industryMap.get(industry)!.placements++;
    }
  }

  const industryBenchmarks = Array.from(industryMap.entries())
    .map(([industry, data]) => ({
      industry,
      jobs: data.jobs,
      avgSalary: data.salaryCount > 0 ? Math.round(data.totalSalary / data.salaryCount) : 0,
      avgFeePercentage:
        data.feeCount > 0 ? (data.totalFee / data.feeCount).toFixed(1) : "0",
      avgTimeToFill:
        data.fillTimeCount > 0
          ? Math.round(data.totalTimeToFill / data.fillTimeCount)
          : 0,
      placements: data.placements,
      fillRate:
        data.jobs > 0
          ? ((data.placements / data.jobs) * 100).toFixed(1)
          : "0",
    }))
    .sort((a, b) => b.jobs - a.jobs);

  // ── Section C: Recruiter Performance ──────────────────────────────────

  const { data: recruiters } = await supabase
    .from("recruiters")
    .select("id, user_id, specializations, total_placements, rating, approval_status")
    .eq("approval_status", "approved")
    .order("total_placements", { ascending: false })
    .limit(10);

  // Fetch recruiter profile names
  const recruiterUserIds = recruiters?.map((r) => r.user_id) ?? [];
  const { data: recruiterProfiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", recruiterUserIds.length > 0 ? recruiterUserIds : ["__none__"]);

  const profileNameMap = new Map<string, string>();
  if (recruiterProfiles) {
    for (const p of recruiterProfiles) {
      profileNameMap.set(p.id, p.full_name || "Okänd");
    }
  }

  // Revenue per recruiter from placements
  const recruiterIds = recruiters?.map((r) => r.id) ?? [];
  const { data: recruiterPlacements } = await supabase
    .from("placements")
    .select("recruiter_id, total_fee")
    .in("recruiter_id", recruiterIds.length > 0 ? recruiterIds : ["__none__"]);

  const recruiterRevenueMap = new Map<string, number>();
  if (recruiterPlacements) {
    for (const p of recruiterPlacements) {
      const current = recruiterRevenueMap.get(p.recruiter_id) ?? 0;
      recruiterRevenueMap.set(p.recruiter_id, current + (p.total_fee || 0));
    }
  }

  // Active mandates per recruiter
  const { data: activeMandates } = await supabase
    .from("job_mandates")
    .select("recruiter_id")
    .eq("is_active", true)
    .in("recruiter_id", recruiterIds.length > 0 ? recruiterIds : ["__none__"]);

  const recruiterMandateMap = new Map<string, number>();
  if (activeMandates) {
    for (const m of activeMandates) {
      const current = recruiterMandateMap.get(m.recruiter_id) ?? 0;
      recruiterMandateMap.set(m.recruiter_id, current + 1);
    }
  }

  const topRecruiters = (recruiters ?? []).map((r) => ({
    id: r.id,
    name: profileNameMap.get(r.user_id) ?? "Okänd",
    specializations: r.specializations ?? [],
    totalPlacements: r.total_placements ?? 0,
    totalRevenue: recruiterRevenueMap.get(r.id) ?? 0,
    rating: r.rating ?? 0,
    activeMandates: recruiterMandateMap.get(r.id) ?? 0,
  }));

  // ── Section D: Monthly Trends ─────────────────────────────────────────

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  // Generate last 6 months labels
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: getMonthKey(d), label: getMonthLabel(d) });
  }

  // Jobs posted per month
  const { data: jobsForTrend } = await supabase
    .from("jobs")
    .select("created_at")
    .gte("created_at", sixMonthsAgo.toISOString());

  const jobsByMonth = new Map<string, number>();
  for (const m of months) jobsByMonth.set(m.key, 0);
  if (jobsForTrend) {
    for (const j of jobsForTrend) {
      const key = getMonthKey(new Date(j.created_at));
      if (jobsByMonth.has(key)) {
        jobsByMonth.set(key, (jobsByMonth.get(key) ?? 0) + 1);
      }
    }
  }

  // Candidates submitted per month
  const { data: candidatesForTrend } = await supabase
    .from("candidates")
    .select("submitted_at")
    .gte("submitted_at", sixMonthsAgo.toISOString());

  const candidatesByMonth = new Map<string, number>();
  for (const m of months) candidatesByMonth.set(m.key, 0);
  if (candidatesForTrend) {
    for (const c of candidatesForTrend) {
      const key = getMonthKey(new Date(c.submitted_at));
      if (candidatesByMonth.has(key)) {
        candidatesByMonth.set(key, (candidatesByMonth.get(key) ?? 0) + 1);
      }
    }
  }

  // Placements per month
  const { data: placementsForTrend } = await supabase
    .from("placements")
    .select("created_at, platform_fee")
    .gte("created_at", sixMonthsAgo.toISOString());

  const placementsByMonth = new Map<string, number>();
  const revenueByMonth = new Map<string, number>();
  for (const m of months) {
    placementsByMonth.set(m.key, 0);
    revenueByMonth.set(m.key, 0);
  }
  if (placementsForTrend) {
    for (const p of placementsForTrend) {
      const key = getMonthKey(new Date(p.created_at));
      if (placementsByMonth.has(key)) {
        placementsByMonth.set(key, (placementsByMonth.get(key) ?? 0) + 1);
      }
      if (revenueByMonth.has(key)) {
        revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + (p.platform_fee || 0));
      }
    }
  }

  // Build trend data arrays with previous month values
  function buildTrendData(monthMap: Map<string, number>) {
    const keys = months.map((m) => m.key);
    return months.map((m, i) => {
      const value = monthMap.get(m.key) ?? 0;
      // For the first month, try to get the month before it as previous
      let previousValue = 0;
      if (i > 0) {
        previousValue = monthMap.get(keys[i - 1]) ?? 0;
      }
      return { month: m.label, value, previousValue };
    });
  }

  const jobsTrend = buildTrendData(jobsByMonth);
  const candidatesTrend = buildTrendData(candidatesByMonth);
  const placementsTrend = buildTrendData(placementsByMonth);
  const revenueTrend = buildTrendData(revenueByMonth);

  // ── Section E: Company Activity ───────────────────────────────────────

  const { data: companies } = await supabase
    .from("companies")
    .select("id, company_name");

  const companyNameMap = new Map<string, string>();
  if (companies) {
    for (const c of companies) {
      companyNameMap.set(c.id, c.company_name || "Okänt företag");
    }
  }

  // Jobs per company
  const { data: jobsByCompany } = await supabase
    .from("jobs")
    .select("company_id");

  const companyJobsMap = new Map<string, number>();
  if (jobsByCompany) {
    for (const j of jobsByCompany) {
      const current = companyJobsMap.get(j.company_id) ?? 0;
      companyJobsMap.set(j.company_id, current + 1);
    }
  }

  // Candidates per company (via jobs -> company mapping)
  const { data: candidatesByCompany } = await supabase
    .from("candidates")
    .select("job_id");

  const { data: jobsWithCompany } = await supabase
    .from("jobs")
    .select("id, company_id");

  const jobToCompanyMap = new Map<string, string>();
  if (jobsWithCompany) {
    for (const j of jobsWithCompany) {
      jobToCompanyMap.set(j.id, j.company_id);
    }
  }

  const companyCandidatesMap = new Map<string, number>();
  if (candidatesByCompany) {
    for (const c of candidatesByCompany) {
      const companyId = jobToCompanyMap.get(c.job_id);
      if (companyId) {
        const current = companyCandidatesMap.get(companyId) ?? 0;
        companyCandidatesMap.set(companyId, current + 1);
      }
    }
  }

  // Placements and spend per company
  const { data: placementsByCompany } = await supabase
    .from("placements")
    .select("company_id, total_fee");

  const companyPlacementsMap = new Map<string, number>();
  const companySpendMap = new Map<string, number>();
  if (placementsByCompany) {
    for (const p of placementsByCompany) {
      const curr = companyPlacementsMap.get(p.company_id) ?? 0;
      companyPlacementsMap.set(p.company_id, curr + 1);
      const spend = companySpendMap.get(p.company_id) ?? 0;
      companySpendMap.set(p.company_id, spend + (p.total_fee || 0));
    }
  }

  // Build top companies list sorted by jobs posted
  const companyIds = companies?.map((c) => c.id) ?? [];
  const topCompanies = companyIds
    .map((id) => ({
      id,
      name: companyNameMap.get(id) ?? "Okänt företag",
      jobsPosted: companyJobsMap.get(id) ?? 0,
      candidatesReceived: companyCandidatesMap.get(id) ?? 0,
      placements: companyPlacementsMap.get(id) ?? 0,
      totalSpend: companySpendMap.get(id) ?? 0,
    }))
    .sort((a, b) => b.jobsPosted - a.jobsPosted)
    .slice(0, 10);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Analys &amp; Benchmarks</h1>
        <p className="text-muted-foreground">
          Detaljerad översikt av plattformens prestanda och branschjämförelser
        </p>
      </div>

      {/* Section A: Platform KPIs */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Plattforms-KPI:er</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatsCard
            title="Total intäkt"
            value={formatCurrency(totalRevenue)}
            icon={<DollarSign className="size-4" />}
          />
          <StatsCard
            title="Placeringar"
            value={totalPlacements ?? 0}
            icon={<Award className="size-4" />}
          />
          <StatsCard
            title="Aktiva jobb"
            value={activeJobs ?? 0}
            icon={<Briefcase className="size-4" />}
          />
          <StatsCard
            title="Snitt tid till tillsättning"
            value={`${avgTimeToFill} dagar`}
            icon={<Clock className="size-4" />}
          />
          <StatsCard
            title="Konverteringsgrad"
            value={`${conversionRate}%`}
            description={`${totalPlacements ?? 0} av ${totalCandidates ?? 0} kandidater`}
            icon={<TrendingUp className="size-4" />}
          />
          <StatsCard
            title="Aktiva rekryterare"
            value={activeRecruiters ?? 0}
            icon={<UserSearch className="size-4" />}
          />
        </div>
      </section>

      {/* Section B: Industry Benchmarks */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Branschjämförelser</CardTitle>
          </CardHeader>
          <CardContent>
            {industryBenchmarks.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bransch</TableHead>
                      <TableHead className="text-right">Jobb</TableHead>
                      <TableHead className="text-right">Snittlön</TableHead>
                      <TableHead className="text-right">Snitt arvode %</TableHead>
                      <TableHead className="text-right">Snitt tid (dagar)</TableHead>
                      <TableHead className="text-right">Placeringar</TableHead>
                      <TableHead className="text-right">Tillsättningsgrad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {industryBenchmarks.map((row) => (
                      <TableRow key={row.industry}>
                        <TableCell className="font-medium">
                          {row.industry}
                        </TableCell>
                        <TableCell className="text-right">{row.jobs}</TableCell>
                        <TableCell className="text-right">
                          {row.avgSalary > 0
                            ? formatCurrency(row.avgSalary)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(row.avgFeePercentage) > 0
                            ? `${row.avgFeePercentage}%`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.avgTimeToFill > 0
                            ? `${row.avgTimeToFill}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.placements}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              Number(row.fillRate) >= 50
                                ? "default"
                                : "secondary"
                            }
                          >
                            {row.fillRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ingen branschdata tillgänglig ännu.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Section C: Recruiter Performance */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Rekryterare - Topp 10 prestation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topRecruiters.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Namn</TableHead>
                      <TableHead>Specialiseringar</TableHead>
                      <TableHead className="text-right">Placeringar</TableHead>
                      <TableHead className="text-right">
                        Total intäkt
                      </TableHead>
                      <TableHead className="text-right">Betyg</TableHead>
                      <TableHead className="text-right">
                        Aktiva mandat
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topRecruiters.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {r.specializations.length > 0
                              ? r.specializations.slice(0, 3).map((s: string) => (
                                  <Badge key={s} variant="secondary" className="text-xs">
                                    {s}
                                  </Badge>
                                ))
                              : "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {r.totalPlacements}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(r.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.rating > 0 ? r.rating.toFixed(1) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.activeMandates}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Inga godkända rekryterare ännu.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Section D: Monthly Trends */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Månadstrender</h2>

        {/* Jobs posted */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Publicerade jobb
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {jobsTrend.map((t) => (
              <TrendCard
                key={t.month}
                month={t.month}
                value={t.value}
                previousValue={t.previousValue}
                format="number"
              />
            ))}
          </div>
        </div>

        {/* Candidates submitted */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Inskickade kandidater
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {candidatesTrend.map((t) => (
              <TrendCard
                key={t.month}
                month={t.month}
                value={t.value}
                previousValue={t.previousValue}
                format="number"
              />
            ))}
          </div>
        </div>

        {/* Placements */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Placeringar
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {placementsTrend.map((t) => (
              <TrendCard
                key={t.month}
                month={t.month}
                value={t.value}
                previousValue={t.previousValue}
                format="number"
              />
            ))}
          </div>
        </div>

        {/* Revenue */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Intäkter
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {revenueTrend.map((t) => (
              <TrendCard
                key={t.month}
                month={t.month}
                value={t.value}
                previousValue={t.previousValue}
                format="currency"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section E: Company Activity */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Företagsaktivitet - Topp 10
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCompanies.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Företag</TableHead>
                      <TableHead className="text-right">
                        Publicerade jobb
                      </TableHead>
                      <TableHead className="text-right">
                        Mottagna kandidater
                      </TableHead>
                      <TableHead className="text-right">Placeringar</TableHead>
                      <TableHead className="text-right">
                        Total kostnad
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCompanies.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-right">
                          {c.jobsPosted}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.candidatesReceived}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.placements}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(c.totalSpend)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Inga företag registrerade ännu.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
