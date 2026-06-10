import { createClient } from "@/lib/supabase/server";
import { CandidatePipeline } from "@/components/dashboard/company/candidate-pipeline";
import { getCandidateProfileNoticeAccepted } from "@/lib/actions/company";
import { getDictionary } from "@/i18n/server";

async function getCompanyCandidates() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!company) return [];

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id")
    .eq("company_id", company.id);

  const jobIds = jobs?.map(j => j.id) || [];
  if (jobIds.length === 0) return [];

  const { data, error } = await supabase
    .from("candidates")
    .select(`
      *,
      job:jobs!inner (
        id,
        title
      ),
      recruiter:recruiters (
        profile:profiles!recruiters_user_id_fkey (
          full_name
        )
      )
    `)
    .in("job_id", jobIds)
    // Visibility gate: the company only sees candidates Recruito has approved.
    // recruito_screened_at is the divider; rejected candidates never get it set.
    .not("recruito_screened_at", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching candidates:", error);
    return [];
  }

  return data || [];
}

export default async function CompanyCandidatesPage() {
  const candidates = await getCompanyCandidates();
  const noticeAccepted = await getCandidateProfileNoticeAccepted();
  const dict = await getDictionary();
  const c = dict.company;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{c.candidatesPageTitle}</h1>
        <p className="text-muted-foreground">{c.candidatesPageSubtitle}</p>
      </div>

      {candidates.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
          <p className="text-muted-foreground">{c.noCandidatesPresented}</p>
        </div>
      ) : (
        <CandidatePipeline candidates={candidates} noticeAccepted={noticeAccepted} />
      )}
    </div>
  );
}
