import { getRecruiterMandates } from "@/lib/actions/recruiter";
import { getDictionary } from "@/i18n/server";
import { RecruiterMandatesView } from "@/components/dashboard/recruiter/recruiter-mandates-view";

export default async function RecruiterMandatesPage() {
  const mandates = await getRecruiterMandates();
  const dict = await getDictionary();
  return <RecruiterMandatesView mandates={mandates} dict={dict.recruiter as Record<string, string>} />;
}
