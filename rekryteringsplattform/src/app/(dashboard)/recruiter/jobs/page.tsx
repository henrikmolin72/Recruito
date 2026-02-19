import { getAvailableJobsForRecruiter } from "@/lib/actions/recruiter";
import { RecruiterJobsList } from "@/components/dashboard/recruiter/recruiter-jobs-list";

export default async function RecruiterJobsPage() {
  const jobs = await getAvailableJobsForRecruiter();

  return <RecruiterJobsList jobs={jobs} />;
}
