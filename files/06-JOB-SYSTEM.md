# STEG 6: Jobbsystem — Affärslogik

## Instruktioner till Claude Code

Implementera affärsregler och statusflöden för jobbsystemet.

---

## 6.1 Jobbstatus-övergångar

```typescript
// src/lib/validations/job-transitions.ts
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["active", "cancelled"],
  active: ["paused", "filled", "closed", "cancelled"],
  paused: ["active", "closed", "cancelled"],
  filled: ["closed"],
  closed: [],
  cancelled: [],
};

export function canTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
```

## 6.2 Mandat-regler (server action)

```typescript
// src/app/(dashboard)/recruiter/jobs/[id]/actions.ts
"use server";

export async function claimMandate(jobId: string) {
  const supabase = await createClient();
  const recruiterId = await getRecruiterId();

  // 1. Kolla att rekryterare är godkänd
  const { data: recruiter } = await supabase
    .from("recruiters")
    .select("approval_status")
    .eq("id", recruiterId)
    .single();
  if (recruiter?.approval_status !== "approved") throw new Error("Inte godkänd");

  // 2. Kolla antal aktiva mandat (max 5 totalt per rekryterare)
  const { count } = await supabase
    .from("job_mandates")
    .select("*", { count: "exact" })
    .eq("recruiter_id", recruiterId)
    .eq("is_active", true);
  if ((count ?? 0) >= 5) throw new Error("Max 5 aktiva mandat");

  // 3. Kolla att jobbet har plats
  const { data: job } = await supabase
    .from("jobs")
    .select("current_recruiter_count, max_recruiters, status")
    .eq("id", jobId)
    .single();
  if (!job || job.status !== "active") throw new Error("Jobbet är inte aktivt");
  if (job.current_recruiter_count >= job.max_recruiters) throw new Error("Alla platser tagna");

  // 4. Kolla att rekryteraren inte redan har mandat
  const { data: existing } = await supabase
    .from("job_mandates")
    .select("id")
    .eq("job_id", jobId)
    .eq("recruiter_id", recruiterId)
    .eq("is_active", true)
    .maybeSingle();
  if (existing) throw new Error("Du har redan mandat för detta jobb");

  // 5. Skapa mandat (trigger uppdaterar current_recruiter_count)
  const { error } = await supabase
    .from("job_mandates")
    .insert({ job_id: jobId, recruiter_id: recruiterId });
  if (error) throw error;
}
```

## 6.3 Kandidat-statusflöde

```typescript
// src/lib/validations/candidate-transitions.ts
const CANDIDATE_TRANSITIONS: Record<string, string[]> = {
  submitted: ["reviewing", "rejected"],
  reviewing: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["hired", "declined"],
  hired: ["guarantee_period"],
  guarantee_period: ["completed"],
  completed: [],
  rejected: [],
  declined: [],
};
```

### Vid status="hired" — skapa placement:
```typescript
export async function hireCandidate(candidateId: string, data: {
  annual_salary: number;
  start_date: string;
}) {
  const candidate = await getCandidate(candidateId);
  const job = await getJob(candidate.job_id);

  const totalFee = data.annual_salary * (job.fee_percentage / 100);
  const platformFee = Math.round(totalFee * 0.25);
  const recruiterFee = Math.round(totalFee * 0.75);

  const guaranteeEndDate = new Date(data.start_date);
  guaranteeEndDate.setDate(guaranteeEndDate.getDate() + 90);

  // 1. Uppdatera kandidatstatus
  await supabase.from("candidates").update({
    status: "hired",
    hired_at: new Date().toISOString()
  }).eq("id", candidateId);

  // 2. Skapa placement
  await supabase.from("placements").insert({
    candidate_id: candidateId,
    job_id: candidate.job_id,
    company_id: job.company_id,
    recruiter_id: candidate.recruiter_id,
    annual_salary: data.annual_salary,
    fee_percentage: job.fee_percentage,
    total_fee: Math.round(totalFee),
    platform_fee: platformFee,
    recruiter_fee: recruiterFee,
    start_date: data.start_date,
    guarantee_end_date: guaranteeEndDate.toISOString().split("T")[0],
  });

  // 3. Uppdatera jobb till filled
  await supabase.from("jobs").update({ status: "filled", filled_at: new Date().toISOString() }).eq("id", candidate.job_id);

  // 4. Notifiera rekryteraren
  await createNotification(candidate.recruiter_id, "Kandidat anställd!", ...);
}
```

**Gå vidare till:** [07-MESSAGING.md](./07-MESSAGING.md)
