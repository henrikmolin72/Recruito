import Link from "next/link";

export const metadata = {
  title: "Policy Pack – Recruito",
  description: "Platform Rules, Hiring Standards & Terms of Service",
};

export default function PolicyPackPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      {/* Back link */}
      <Link href="/" className="text-sm text-brand-600 hover:underline">&larr; Back to Recruito</Link>

      <header className="space-y-2">
        <h1 className="text-4xl font-bold">Policy Pack</h1>
        <p className="text-lg text-muted-foreground">Platform Rules, Hiring Standards &amp; Terms of Service</p>
      </header>

      {/* Table of Contents */}
      <nav className="rounded-lg border border-border p-6 bg-muted/30 space-y-2">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Sections</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li><a href="#how-recruito-works" className="text-brand-600 hover:underline">How Recruito Works</a></li>
          <li><a href="#fee-rules" className="text-brand-600 hover:underline">Recruito Fee Rules</a></li>
          <li><a href="#hiring-process" className="text-brand-600 hover:underline">Recruito Hiring Process Standard</a></li>
          <li><a href="#terms-of-service" className="text-brand-600 hover:underline">Terms of Service</a></li>
        </ol>
      </nav>

      {/* ===== SECTION 1 ===== */}
      <section id="how-recruito-works" className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-border pb-3">1. How Recruito Works</h2>
        <p className="text-sm leading-6">
          Recruito is a data-driven recruitment marketplace that connects companies with independent recruiters to streamline hiring through structured workflows, AI-assisted candidate matching, and transparent performance metrics.
        </p>
        <p className="text-sm leading-6">
          The platform focuses on transparency, efficiency, and candidate protection, ensuring faster hiring cycles and stronger collaboration between companies and recruiters.
        </p>

        {/* For Companies */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">For Companies</h3>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Post Roles</h4>
            <p className="text-sm leading-6">Companies publish job descriptions with clear requirements, including:</p>
            <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
              <li>mandatory salary ranges</li>
              <li>benefits</li>
              <li>hiring timelines</li>
              <li>a selected replacement guarantee period</li>
            </ul>
            <p className="text-sm leading-6">Companies may choose a guarantee period ranging from 0 to 2 months, depending on their hiring preferences.</p>
            <p className="text-sm leading-6">A 0-month guarantee means the placement is considered successful once the candidate begins employment.</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Receive Candidates</h4>
            <p className="text-sm leading-6">Recruiters submit candidates through Recruito. Each submission includes:</p>
            <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
              <li>candidate profile</li>
              <li>CV and supporting information</li>
              <li>an AI-powered JD/CV match score</li>
            </ul>
            <p className="text-sm leading-6">This score helps companies quickly identify strong candidates.</p>
            <p className="text-sm leading-6">Only the first valid submission recorded on the platform is considered eligible for candidate ownership and recruitment fee eligibility.</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Review &amp; Interview</h4>
            <p className="text-sm leading-6">Companies are expected to review submitted candidates within 5 working days.</p>
            <p className="text-sm leading-6">If a candidate is shortlisted, companies should schedule interviews in a timely manner and keep candidate status updated on the platform.</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Hiring Decision</h4>
            <p className="text-sm leading-6">Recruito recommends completing the hiring process within a standard 6-week hiring timeline from candidate submission to hiring decision.</p>
            <p className="text-sm leading-6">Companies may extend the timeline when necessary but should document the reason within the platform.</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Fee Payment</h4>
            <p className="text-sm leading-6">If a candidate is successfully hired and completes the selected guarantee period, the company pays the agreed recruitment success fee according to Recruito Fee Rules.</p>
            <p className="text-sm leading-6">The recruitment success fee is payable by the company.</p>
          </div>
        </div>

        {/* For Recruiters */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">For Recruiters</h3>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Select Roles</h4>
            <p className="text-sm leading-6">Recruiters browse available job opportunities and choose roles aligned with their expertise.</p>
            <p className="text-sm leading-6">Up to 5 recruiters may work on a single assignment simultaneously.</p>
            <p className="text-sm leading-6">Each recruiter receives a 10-day mandate period.</p>
            <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
              <li>If no candidate is submitted within 10 days, the mandate expires.</li>
              <li>If a recruiter submits a candidate, they remain active on the assignment until the candidate is rejected.</li>
            </ul>
            <p className="text-sm leading-6">Once rejected, a new 10-day mandate period begins, allowing the recruiter to submit another candidate.</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Candidate Consent Requirement</h4>
            <p className="text-sm leading-6">Recruiters must confirm that each candidate has given consent to be represented for the specific role before submission.</p>
            <p className="text-sm leading-6">Submitting candidates without their knowledge or approval is strictly prohibited.</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Submit Candidates</h4>
            <p className="text-sm leading-6">Before submitting a candidate, recruiters receive an AI JD/CV Match Score.</p>
            <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
              <li>Submissions above 80% are recommended</li>
              <li>Submissions below 80% trigger a platform warning</li>
            </ul>
            <p className="text-sm leading-6">Submitting candidates with a score below 80% may negatively impact the recruiter&apos;s Recruiter Quality Score.</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Track Candidate Progress</h4>
            <p className="text-sm leading-6">Recruiters can monitor:</p>
            <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
              <li>candidate status</li>
              <li>interview stages</li>
              <li>feedback from companies</li>
            </ul>
            <p className="text-sm leading-6">through the Recruito dashboard.</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Earn Recruitment Fees</h4>
            <p className="text-sm leading-6">Recruiters receive recruitment fees only when a candidate is successfully hired and completes the selected guarantee period, in accordance with Recruito Fee Rules.</p>
          </div>
        </div>
      </section>

      {/* ===== SECTION 2 ===== */}
      <section id="fee-rules" className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-border pb-3">2. Recruito Fee Rules</h2>
        <p className="text-sm leading-6">Recruito operates on a success-based recruitment model.</p>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Standard Recruitment Fee</h3>
          <p className="text-sm leading-6">The typical recruitment fee is 12% of the candidate&apos;s gross annual salary, although this may vary depending on:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>candidate salary range</li>
            <li>job complexity</li>
            <li>guarantee period selected</li>
            <li>hiring conditions</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Recruitment Fee Calculator for Companies</h3>
          <p className="text-sm leading-6">Recruito provides an innovative Recruitment Fee Calculator that allows companies to estimate recruitment fees before publishing a job.</p>
          <p className="text-sm leading-6">The calculator provides:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>an estimated recruitment fee based on the selected guarantee period</li>
            <li>transparent cost expectations before posting a role</li>
          </ul>
          <p className="text-sm leading-6">This tool helps companies plan recruitment costs before engagement.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Fee Payment Trigger</h3>
          <p className="text-sm leading-6">The recruitment fee becomes payable when:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>a candidate submitted through Recruito is successfully hired and completes the selected guarantee period, or</li>
            <li>a candidate introduced through Recruito is hired outside the platform within the candidate ownership period, including but not limited to:
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>the role for which they were submitted</li>
                <li>any other role within the same company</li>
              </ul>
            </li>
          </ul>
          <p className="text-sm leading-6">Payment is typically due within 14 days following successful completion of the guarantee period, unless otherwise agreed.</p>
          <p className="text-sm leading-6">Recruito reserves the right to suspend company accounts or restrict job postings in cases of overdue payment.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Introductory Offer for New Companies</h3>
          <p className="text-sm leading-6">New companies joining Recruito receive a 2-month free trial period starting from their registration date.</p>
          <p className="text-sm leading-6">During this period:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>companies can publish jobs without platform subscription fees</li>
            <li>recruitment success fees still apply</li>
            <li>the &euro;100 Final Interview Incentive applies</li>
          </ul>
          <p className="text-sm leading-6">After the trial ends, companies transition to Recruito&apos;s subscription model.</p>
          <p className="text-sm leading-6 italic text-muted-foreground">Note for Recruiters: Recruiters currently use the platform free of charge under all subscription plans. Recruito may introduce recruiter service fees or premium tools in future platform updates.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Final Interview Incentive (&euro;100 Recruiter Reward)</h3>
          <p className="text-sm leading-6">During a company&apos;s 2-month introductory period, Recruito offers a Final Interview Incentive Program.</p>
          <p className="text-sm leading-6">If a recruiter&apos;s candidate reaches and attends the final interview stage, the recruiter receives &euro;100.</p>
          <p className="text-sm leading-6">This incentive is paid by the company.</p>
          <p className="text-sm leading-6">A Final Interview is defined as: the last interview stage prior to a hiring decision, as defined by the company within the platform hiring workflow.</p>
          <p className="text-sm leading-6">The candidate must attend the scheduled interview for the incentive to apply.</p>
          <p className="text-sm leading-6">The program aims to:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>encourage high-quality submissions</li>
            <li>reward strong candidate matching</li>
            <li>support efficient hiring collaboration during the trial period</li>
          </ul>
          <p className="text-sm leading-6">Recruito may modify or withdraw this program at any time.</p>
        </div>
      </section>

      {/* ===== SECTION 3 ===== */}
      <section id="hiring-process" className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-border pb-3">3. Recruito Hiring Process Standard</h2>
        <p className="text-sm leading-6">Recruito promotes a structured hiring process designed to maintain fairness, transparency, and efficiency.</p>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">6-Week Standard Hiring Timeline</h3>
          <p className="text-sm leading-6">Recruito recommends that candidates move from submission to hiring decision within 6 weeks.</p>
          <p className="text-sm leading-6">Companies may extend this timeline when necessary but should document the reason in the platform.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Candidate Presentation Rules</h3>
          <p className="text-sm leading-6">To maintain candidate quality and prevent excessive submissions:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>A maximum of 7 candidates per role may be presented initially</li>
          </ul>
          <p className="text-sm leading-6">Additional candidates may be submitted only after the initial group has been reviewed.</p>
          <p className="text-sm leading-6">If a company rejects 5 or more of the initial 7 candidates, the company must provide feedback on the platform before additional submissions are made.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Hiring Process Steps</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border bg-muted/30"><td className="px-4 py-2 font-medium">1. Job Publication</td><td className="px-4 py-2">Company publishes job description, salary range, and guarantee period</td></tr>
                <tr className="border-b border-border"><td className="px-4 py-2 font-medium">2. Recruiter Participation</td><td className="px-4 py-2">Recruiters choose roles to work on</td></tr>
                <tr className="border-b border-border bg-muted/30"><td className="px-4 py-2 font-medium">3. Candidate Submission</td><td className="px-4 py-2">Recruiters submit candidates with AI match scores</td></tr>
                <tr className="border-b border-border"><td className="px-4 py-2 font-medium">4. Initial Candidate Review</td><td className="px-4 py-2">Companies review candidates within 5 working days</td></tr>
                <tr className="border-b border-border bg-muted/30"><td className="px-4 py-2 font-medium">5. Interview Process</td><td className="px-4 py-2">Interviews are scheduled</td></tr>
                <tr className="border-b border-border"><td className="px-4 py-2 font-medium">6. Hiring Decision</td><td className="px-4 py-2">Ideally completed within 6 weeks</td></tr>
                <tr className="border-b border-border bg-muted/30"><td className="px-4 py-2 font-medium">7. Guarantee Period</td><td className="px-4 py-2">Candidate begins employment</td></tr>
                <tr><td className="px-4 py-2 font-medium">8. Recruitment Fee Payment</td><td className="px-4 py-2">Triggered upon successful guarantee completion</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">AI JD/CV Matching Algorithm</h3>
          <p className="text-sm leading-6">Recruito uses an AI-powered matching algorithm to improve candidate relevance.</p>
          <p className="text-sm leading-6">Recruiters receive a match score before submission:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>above 80% &mdash; recommended</li>
            <li>below 80% &mdash; generates warning</li>
          </ul>
          <p className="text-sm leading-6">The AI-generated score is an algorithmic recommendation only. It does not guarantee candidate suitability, skill, or cultural fit. Final hiring decisions remain the sole responsibility of the company.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Recruiter Quality Score</h3>
          <p className="text-sm leading-6">Recruito evaluates recruiter performance using a Recruiter Quality Score based on:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>percentage of submissions above 80% match score</li>
            <li>candidate acceptance rate</li>
            <li>interview-to-hire ratio</li>
            <li>submission relevance</li>
            <li>response speed to feedback</li>
          </ul>
          <p className="text-sm leading-6">Higher scores may increase recruiter visibility. Lower scores may reduce visibility or access to certain roles.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Company Activity Score</h3>
          <p className="text-sm leading-6">Recruito also evaluates companies through a Company Activity Score based on:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>response speed to submissions</li>
            <li>interview scheduling reliability</li>
            <li>hiring decision timelines</li>
            <li>quality of rejection feedback</li>
          </ul>
          <p className="text-sm leading-6">Companies with strong engagement may receive greater recruiter participation.</p>
        </div>
      </section>

      {/* ===== SECTION 4 ===== */}
      <section id="terms-of-service" className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-border pb-3">4. Terms of Service</h2>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Definitions</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border bg-muted/30"><td className="px-4 py-2 font-medium w-48">Platform</td><td className="px-4 py-2">Recruito marketplace</td></tr>
                <tr className="border-b border-border"><td className="px-4 py-2 font-medium">User</td><td className="px-4 py-2">Any recruiter or company using Recruito</td></tr>
                <tr className="border-b border-border bg-muted/30"><td className="px-4 py-2 font-medium">Candidate</td><td className="px-4 py-2">Person submitted for employment</td></tr>
                <tr className="border-b border-border"><td className="px-4 py-2 font-medium">Recruiter</td><td className="px-4 py-2">Individual or agency submitting candidates</td></tr>
                <tr className="border-b border-border bg-muted/30"><td className="px-4 py-2 font-medium">Company</td><td className="px-4 py-2">Organization hiring candidates</td></tr>
                <tr className="border-b border-border"><td className="px-4 py-2 font-medium">Guarantee Period</td><td className="px-4 py-2">Selected replacement period (0&ndash;2 months)</td></tr>
                <tr><td className="px-4 py-2 font-medium">Introductory Period</td><td className="px-4 py-2">2-month free trial for companies</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Candidate Ownership Window (12 Months)</h3>
          <p className="text-sm leading-6">Candidates submitted through Recruito remain protected for 12 months.</p>
          <p className="text-sm leading-6">If a company hires or engages the candidate within this period, the recruitment fee remains payable.</p>
          <p className="text-sm leading-6">This applies whether the candidate is hired for:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>the original role</li>
            <li>another role within the same company</li>
          </ul>
          <p className="text-sm leading-6">The rule prevents platform circumvention.</p>
          <p className="text-sm leading-6"><strong>Exception:</strong> The ownership rule does not apply if the company provides documented evidence that the candidate previously applied directly or previously worked for the company.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">No Off-Platform Hiring / Circumvention</h3>
          <p className="text-sm leading-6">Companies and recruiters agree not to bypass the platform by engaging directly with candidates introduced through Recruito for the purpose of avoiding recruitment fees.</p>
          <p className="text-sm leading-6">Circumvention may result in: fee enforcement, account suspension, or permanent platform removal.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Candidate Withdrawal</h3>
          <p className="text-sm leading-6">Candidates may withdraw from the hiring process at any stage.</p>
          <p className="text-sm leading-6">Recruiters must promptly update the platform if a candidate becomes unavailable.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Replacement Guarantee</h3>
          <p className="text-sm leading-6">All placements include a replacement guarantee based on the selected guarantee period.</p>
          <p className="text-sm leading-6">If a candidate leaves or is terminated during the guarantee period:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>the job will reopen on the platform</li>
            <li>recruiters may submit replacement candidates</li>
          </ul>
          <p className="text-sm leading-6">The guarantee does not apply when termination occurs due to: layoffs, company restructuring, or gross misconduct (fraud, theft, violence, etc.).</p>
          <p className="text-sm leading-6">Recruiters are paid only when the guarantee period is successfully completed.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Recruiter Code of Conduct</h3>
          <p className="text-sm leading-6">Recruiters must not:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>submit candidates without consent</li>
            <li>misrepresent candidate qualifications</li>
            <li>pressure candidates to accept offers</li>
            <li>submit duplicate candidates under different identities</li>
          </ul>
          <p className="text-sm leading-6">Violations may result in account suspension or removal.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Recruiter Dispute Handling</h3>
          <p className="text-sm leading-6">If multiple recruiters submit the same candidate, ownership is determined by first valid submission recorded in the platform.</p>
          <p className="text-sm leading-6">Recruito&apos;s decision is final regarding fee eligibility.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Fraud and Fake Candidate Protection</h3>
          <p className="text-sm leading-6">The following actions are prohibited:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>submitting fake candidates</li>
            <li>submitting candidates without consent</li>
            <li>manipulating platform metrics</li>
            <li>duplicate submissions under different identities</li>
          </ul>
          <p className="text-sm leading-6">Accounts involved in fraud may be suspended or permanently removed.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Candidate Data &amp; Privacy</h3>
          <p className="text-sm leading-6">Candidate information is confidential. Users must not share candidate data outside the platform without consent.</p>
          <p className="text-sm leading-6">Recruito processes data in accordance with GDPR and applicable data protection laws.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Intellectual Property</h3>
          <p className="text-sm leading-6">All platform software, algorithms, branding, and content remain the property of Recruito. Users may not copy or distribute platform materials without permission.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Limitation of Liability</h3>
          <p className="text-sm leading-6">Recruito acts solely as a technology platform connecting companies and recruiters.</p>
          <p className="text-sm leading-6">Recruito is not responsible for: employment decisions, hiring outcomes, or candidate performance after hire.</p>
          <p className="text-sm leading-6">Platform use is at the user&apos;s own risk.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Account Suspension and Termination</h3>
          <p className="text-sm leading-6">Recruito may suspend or terminate accounts that violate platform rules, including: fraud, non-payment, or misuse of the platform.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Amendments</h3>
          <p className="text-sm leading-6">Recruito reserves the right to update these Terms of Service. Continued platform use constitutes acceptance of updated terms.</p>
        </div>
      </section>

      {/* Footer nav */}
      <footer className="pt-6 border-t border-border flex justify-between text-sm">
        <Link href="/" className="text-brand-600 hover:underline">&larr; Back to Recruito</Link>
        <Link href="/privacy-policy" className="text-brand-600 hover:underline">Privacy &amp; Cookie Policy &rarr;</Link>
      </footer>
    </main>
  );
}
