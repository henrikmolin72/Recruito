import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions – Recruito",
  description:
    "Recruito Terms & Conditions for Companies and Recruiters using the Recruito recruitment marketplace.",
};

const SectionHeading = ({ children, id }: { children: React.ReactNode; id?: string }) => (
  <h2 id={id} className="text-xl font-semibold mt-10 mb-3 scroll-mt-20">
    {children}
  </h2>
);

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-base font-semibold mt-6 mb-2">{children}</h3>
);

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-sm leading-7 text-slate-700">
      <header className="space-y-2 mb-10">
        <h1 className="text-3xl font-bold text-slate-900">Terms &amp; Conditions</h1>
        <p className="text-sm text-muted-foreground">Last updated: 12 May 2026</p>
        <p className="text-sm text-muted-foreground">
          Operator: Recruito AB · Stockholm, Sweden ·{" "}
          <a href="mailto:hello@recruito.eu" className="text-brand-600 hover:underline">
            hello@recruito.eu
          </a>
        </p>
      </header>

      <section className="space-y-3">
        <p>
          These Terms &amp; Conditions (the &ldquo;<strong>Terms</strong>&rdquo;) govern your use of the
          Recruito platform (the &ldquo;<strong>Platform</strong>&rdquo;), operated by Recruito AB
          (&ldquo;<strong>Recruito</strong>&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or
          using the Platform you agree to these Terms.
        </p>
        <p>
          The Platform is a SaaS recruitment marketplace that connects hiring companies
          (&ldquo;<strong>Companies</strong>&rdquo;) with independent recruiters (&ldquo;
          <strong>Recruiters</strong>&rdquo;). Recruiters present qualified candidates for open
          mandates; Companies hire those candidates through the Platform on a success-fee basis.
        </p>
      </section>

      <SectionHeading id="definitions">1. Definitions</SectionHeading>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Candidate</strong> – a person presented by a Recruiter for a Mandate.</li>
        <li><strong>Mandate</strong> – an open role published by a Company on the Platform.</li>
        <li><strong>Placement</strong> – a signed employment contract between a Company and a Candidate originally presented through the Platform.</li>
        <li><strong>Placement Fee</strong> – the success fee owed by the Company to Recruito upon a Placement.</li>
        <li><strong>Reward</strong> – the share of the Placement Fee paid to the Recruiter who delivered the Candidate.</li>
      </ul>

      <SectionHeading id="account">2. Accounts and Eligibility</SectionHeading>
      <p>
        You must be at least 18 years old and authorized to act on behalf of the organization
        you register. You are responsible for the accuracy of the information you provide and
        for all activity under your account. Credentials may not be shared between users.
      </p>

      <SectionHeading id="company-fees">3. Company Fees (Pay-on-Hire)</SectionHeading>
      <SubHeading>3.1 Success-fee model</SubHeading>
      <p>
        Recruito operates a pure success-fee model. <strong>There are no subscription fees,
        no per-job fees, and no payment is owed for browsing or interviewing candidates.</strong>
        A Placement Fee becomes due only when a Placement occurs.
      </p>
      <SubHeading>3.2 Placement Fee</SubHeading>
      <p>
        The Placement Fee for each Mandate is the percentage of the Candidate&rsquo;s annual gross
        salary agreed in the Mandate, subject to a <strong>minimum Placement Fee of €3,500</strong>{" "}
        (or equivalent in local currency) per successful hire.
      </p>
      <SubHeading>3.3 Invoicing &amp; payment terms</SubHeading>
      <p>
        Recruito invoices the Company within five (5) business days of the Candidate&rsquo;s
        signed employment contract. Payment terms are <strong>net 14 days</strong> from the invoice
        date. Late payments accrue statutory interest under the Swedish Interest Act
        (räntelagen) and may, after written reminder, lead to account suspension and debt
        collection.
      </p>
      <SubHeading>3.4 Free for Recruiters and free to publish Mandates</SubHeading>
      <p>
        Publishing Mandates and inviting Recruiters is free of charge. Recruiters do not pay
        any fee to use the Platform.
      </p>

      <SectionHeading id="recruiter-earnings">4. Recruiter Earnings (Reward)</SectionHeading>
      <SubHeading>4.1 How Rewards are earned</SubHeading>
      <p>
        A Recruiter earns a Reward when a Candidate they presented is hired and the Company
        has paid the Placement Fee in full. The Reward percentage and any bonuses are shown
        on each Mandate before the Recruiter submits a Candidate.
      </p>
      <SubHeading>4.2 Payout</SubHeading>
      <p>
        Recruito pays the Reward to the Recruiter within <strong>30 days</strong> of receipt of the
        Placement Fee from the Company. The Recruiter invoices Recruito (not the Company)
        and is responsible for their own tax, VAT, and social-charge reporting.
      </p>

      <SectionHeading id="placement-rules">5. Placement Rules</SectionHeading>
      <SubHeading>5.1 Candidate consent</SubHeading>
      <p>
        Recruiters may only present Candidates who have given informed consent to be
        represented for the Mandate, including the sharing of their CV and contact details
        with the Company through the Platform.
      </p>
      <SubHeading>5.2 First-to-submit</SubHeading>
      <p>
        Candidate ownership follows a <strong>first-to-submit</strong> rule. The first Recruiter
        to present a Candidate for a Mandate is the owning Recruiter for that Candidate on
        that Mandate, provided the submission meets the Mandate&rsquo;s qualification criteria.
      </p>
      <SubHeading>5.3 45-day decision window</SubHeading>
      <p>
        Companies are expected to make a final decision on presented Candidates within{" "}
        <strong>45 days</strong> of presentation. After 45 days, the Candidate may be
        deprioritized and the Recruiter may withdraw the submission.
      </p>
      <SubHeading>5.4 Reporting hires</SubHeading>
      <p>
        Companies must report any hire of a Platform-introduced Candidate, whether through
        the Platform or off-platform, within <strong>6 months</strong> of the Candidate&rsquo;s
        introduction. Off-platform hires of Platform-introduced Candidates within this period
        remain subject to the Placement Fee.
      </p>

      <SectionHeading id="guarantee">6. Placement Guarantee</SectionHeading>
      <p>
        Where a written guarantee is included in a Mandate, the Company must notify Recruito
        within <strong>14 days</strong> of the Candidate&rsquo;s departure. The Recruiter is then given
        a reasonable replacement period (typically 30 days) to present a qualifying
        replacement Candidate at no additional Placement Fee. Failure by the Recruiter to
        deliver a replacement within that period may result in a partial refund as agreed in
        the Mandate.
      </p>

      <SectionHeading id="data">7. Data &amp; Ownership</SectionHeading>
      <p>
        The Company owns the data it uploads. Candidates own their personal data. Recruito
        processes data only to deliver the Platform and as described in our{" "}
        <Link href="/integritetspolicy" className="text-brand-600 hover:underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/gdpr" className="text-brand-600 hover:underline">
          GDPR notice
        </Link>
        . Aggregated, anonymized data may be used to improve the Platform and for
        benchmarking. All parties must comply with the EU General Data Protection Regulation
        (GDPR).
      </p>

      <SectionHeading id="ai">8. AI Features</SectionHeading>
      <p>
        Parts of the Platform use AI to assist with screening, matching, and summarization.
        AI output is advisory only; hiring decisions remain the Company&rsquo;s responsibility.
        Use of AI features is also governed by Recruito&rsquo;s AI Policy made available in-app.
      </p>

      <SectionHeading id="usage">9. Acceptable Use</SectionHeading>
      <p>
        The Platform is intended solely for legitimate recruitment. You agree not to scrape
        the Platform, submit fake or non-consenting Candidates, misrepresent qualifications,
        or interfere with the Platform&rsquo;s operation. Violations may result in immediate
        suspension and forfeiture of any pending Rewards.
      </p>

      <SectionHeading id="termination">10. Suspension &amp; Termination</SectionHeading>
      <p>
        Either party may terminate its account at any time with written notice. Rights and
        obligations arising before termination, including unpaid Placement Fees and Rewards,
        survive termination. Recruito may suspend or terminate access immediately for breach
        of these Terms or applicable law.
      </p>

      <SectionHeading id="liability">11. Limitation of Liability</SectionHeading>
      <p>
        To the maximum extent permitted by law, Recruito is not liable for any indirect,
        incidental, or consequential damages, lost profits, or lost opportunities. Recruito&rsquo;s
        total aggregate liability under these Terms is limited to the Placement Fees paid by
        the affected Company to Recruito during the twelve (12) months preceding the event
        giving rise to the claim.
      </p>

      <SectionHeading id="changes">12. Changes to these Terms</SectionHeading>
      <p>
        We may update these Terms from time to time. Material changes will be communicated
        by email or in-app at least 14 days before they take effect. Continued use of the
        Platform after the effective date constitutes acceptance of the updated Terms.
      </p>

      <SectionHeading id="law">13. Governing Law &amp; Disputes</SectionHeading>
      <p>
        These Terms are governed by the laws of <strong>Sweden</strong>, excluding its conflict-of-law
        rules. Disputes shall be settled by the general courts of Sweden, with{" "}
        <strong>Stockholm District Court</strong> (Stockholms tingsrätt) as the court of first instance.
      </p>

      <SectionHeading id="contact">14. Contact</SectionHeading>
      <p>
        Recruito AB · Stockholm, Sweden ·{" "}
        <a href="mailto:hello@recruito.eu" className="text-brand-600 hover:underline">
          hello@recruito.eu
        </a>
      </p>

      <footer className="pt-8 mt-10 border-t border-slate-100 text-xs text-muted-foreground">
        <Link href="/" className="text-brand-600 hover:underline">
          ← Back to home
        </Link>
      </footer>
    </main>
  );
}
