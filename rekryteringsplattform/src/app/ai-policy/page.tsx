import Link from "next/link";
import { AppLogo } from "@/components/shared/app-logo";
import { AiPolicyContent } from "@/components/compliance/ai-policy-content";

// Public AI transparency page. The dashboard copies at /company/ai-policy and
// /recruiter/ai-policy are auth-gated, so candidates — the people the EU AI Act
// Art. 26(7)/86 disclosure is actually FOR — could not reach any of it. Same
// component, candidate framing, no login.
export const metadata = {
  title: "AI Screening Policy | Recruito",
  description: "How Recruito uses AI when evaluating candidates, and your rights.",
};

export default function PublicAiPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <Link href="/">
            <AppLogo size="md" priority />
          </Link>
        </div>
        <AiPolicyContent role="candidate" />
        <p className="pb-8 text-center text-xs text-slate-500">
          See also our{" "}
          <Link href="/integritetspolicy" className="font-semibold text-brand-600 hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
