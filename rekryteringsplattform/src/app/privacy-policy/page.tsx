import Link from "next/link";

export const metadata = {
  title: "Privacy & Cookie Policy – Recruito",
  description: "How Recruito collects, uses, stores, and protects personal data",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      {/* Back link */}
      <Link href="/" className="text-sm text-brand-600 hover:underline">&larr; Back to Recruito</Link>

      <header className="space-y-2">
        <h1 className="text-4xl font-bold">Privacy &amp; Cookie Policy</h1>
        <p className="text-sm text-muted-foreground">Last Updated: March 8, 2026</p>
      </header>

      <section className="space-y-4">
        <p className="text-sm leading-6">
          Recruito (&ldquo;Recruito&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates a recruitment marketplace platform that connects companies with independent recruiters.
        </p>
        <p className="text-sm leading-6">
          This Privacy &amp; Cookie Policy explains how Recruito collects, uses, stores, and protects personal data when users access or use the platform.
        </p>
        <p className="text-sm leading-6">
          Recruito is committed to protecting the privacy of companies, recruiters, and candidates and processes personal data in accordance with applicable data protection laws including the General Data Protection Regulation (GDPR) and Swedish data protection regulations.
        </p>
        <p className="text-sm leading-6">
          By using the Recruito platform, you agree to the practices described in this policy.
        </p>
      </section>

      {/* 1. Data Controller */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold border-b border-border pb-3">1. Data Controller</h2>
        <p className="text-sm leading-6">Recruito acts as the data controller for personal data processed through the platform.</p>
        <p className="text-sm leading-6"><strong>Platform operator:</strong> Recruito<br /><strong>Location:</strong> Sweden</p>
        <p className="text-sm leading-6">For privacy-related inquiries, users may contact:<br /><strong>Email:</strong> <a href="mailto:privacy@recruito.com" className="text-brand-600 hover:underline">privacy@recruito.com</a></p>
      </section>

      {/* 2. Categories of Personal Data */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b border-border pb-3">2. Categories of Personal Data We Collect</h2>
        <p className="text-sm leading-6">Recruito collects different types of personal data depending on how users interact with the platform.</p>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Account Information</h3>
          <p className="text-sm leading-6">When users create an account, we may collect:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>name</li>
            <li>email address</li>
            <li>phone number</li>
            <li>company name</li>
            <li>recruiter or company profile information</li>
            <li>login credentials</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Candidate Information</h3>
          <p className="text-sm leading-6">When recruiters submit candidates through the platform, Recruito may process:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>candidate name</li>
            <li>CV or resume</li>
            <li>employment history</li>
            <li>education details</li>
            <li>skills and qualifications</li>
            <li>contact details</li>
            <li>salary expectations</li>
            <li>interview feedback or evaluation notes</li>
          </ul>
          <p className="text-sm leading-6">Recruiters must ensure that candidates have given consent to be represented for a specific role before their data is submitted to the platform.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Recruitment Process Data</h3>
          <p className="text-sm leading-6">During the hiring process, the platform may process:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>candidate submissions</li>
            <li>AI match scores</li>
            <li>interview status</li>
            <li>hiring decisions</li>
            <li>recruiter and company feedback</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Platform Usage Data</h3>
          <p className="text-sm leading-6">Recruito may collect information related to platform usage, including:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>IP address</li>
            <li>device information</li>
            <li>browser type</li>
            <li>session activity</li>
            <li>log files</li>
            <li>interaction with platform features</li>
          </ul>
          <p className="text-sm leading-6">This data helps maintain platform performance and security.</p>
        </div>
      </section>

      {/* 3. How We Use Personal Data */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b border-border pb-3">3. How We Use Personal Data</h2>
        <p className="text-sm leading-6">Recruito processes personal data for the following purposes:</p>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Platform Operation</h3>
          <p className="text-sm leading-6">To operate the Recruito recruitment marketplace, including:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>enabling recruiter and company accounts</li>
            <li>managing job postings</li>
            <li>enabling candidate submissions</li>
            <li>facilitating interviews and hiring decisions</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Recruitment Process Facilitation</h3>
          <p className="text-sm leading-6">To allow companies and recruiters to interact with candidates and complete hiring processes through the platform.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Platform Improvement</h3>
          <p className="text-sm leading-6">To improve platform functionality, including:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>improving AI matching systems</li>
            <li>analyzing recruitment workflows</li>
            <li>identifying platform performance issues</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Fraud Prevention and Security</h3>
          <p className="text-sm leading-6">To detect, prevent, and investigate fraudulent activity or misuse of the platform.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Legal Compliance</h3>
          <p className="text-sm leading-6">To comply with applicable laws and regulatory requirements.</p>
        </div>
      </section>

      {/* 4. Legal Basis */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b border-border pb-3">4. Legal Basis for Processing (GDPR)</h2>
        <p className="text-sm leading-6">Recruito processes personal data based on the following legal grounds under the General Data Protection Regulation:</p>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Contractual Necessity</h3>
          <p className="text-sm leading-6">Processing required to operate the Recruito platform and provide recruitment services.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Legitimate Interests</h3>
          <p className="text-sm leading-6">Processing necessary to maintain platform security, prevent fraud, and improve services.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Consent</h3>
          <p className="text-sm leading-6">Certain data processing activities may rely on user or candidate consent, particularly when recruiters submit candidate information.</p>
          <p className="text-sm leading-6">Users may withdraw consent at any time where consent is the legal basis for processing.</p>
        </div>
      </section>

      {/* 5. Data Sharing */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b border-border pb-3">5. Data Sharing</h2>
        <p className="text-sm leading-6">Recruito may share personal data in the following situations.</p>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Between Recruiters and Companies</h3>
          <p className="text-sm leading-6">Candidate information submitted by recruiters is shared with companies participating in the recruitment process.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Service Providers</h3>
          <p className="text-sm leading-6">Recruito may use trusted third-party service providers for:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>cloud hosting</li>
            <li>platform infrastructure</li>
            <li>analytics tools</li>
            <li>communication services</li>
          </ul>
          <p className="text-sm leading-6">These providers are required to process personal data only on behalf of Recruito and in accordance with applicable data protection laws.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Legal Obligations</h3>
          <p className="text-sm leading-6">Recruito may disclose personal data if required to do so by law or regulatory authorities.</p>
        </div>
      </section>

      {/* 6. International Data Transfers */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold border-b border-border pb-3">6. International Data Transfers</h2>
        <p className="text-sm leading-6">Recruito may use service providers that process data outside the European Economic Area (EEA).</p>
        <p className="text-sm leading-6">In such cases, Recruito ensures that appropriate safeguards are in place, including:</p>
        <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
          <li>Standard Contractual Clauses approved by the European Commission</li>
          <li>other legally approved transfer mechanisms</li>
        </ul>
      </section>

      {/* 7. Data Retention */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold border-b border-border pb-3">7. Data Retention</h2>
        <p className="text-sm leading-6">Recruito retains personal data only for as long as necessary to fulfill the purposes described in this policy.</p>
        <p className="text-sm leading-6">Typical retention periods may include:</p>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border bg-muted/30"><td className="px-4 py-2 font-medium">Candidate data</td><td className="px-4 py-2">Up to 12 months after last recruitment activity</td></tr>
              <tr className="border-b border-border"><td className="px-4 py-2 font-medium">User account data</td><td className="px-4 py-2">Retained while the account remains active</td></tr>
              <tr><td className="px-4 py-2 font-medium">Platform records</td><td className="px-4 py-2">Retained as required for legal or operational purposes</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm leading-6">Data may be retained longer if required for legal compliance or dispute resolution.</p>
      </section>

      {/* 8. User Rights */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold border-b border-border pb-3">8. User Rights Under GDPR</h2>
        <p className="text-sm leading-6">Under the General Data Protection Regulation, users have the right to:</p>
        <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
          <li>access their personal data</li>
          <li>request correction of inaccurate data</li>
          <li>request deletion of personal data</li>
          <li>restrict processing in certain circumstances</li>
          <li>object to certain types of processing</li>
          <li>request data portability</li>
        </ul>
        <p className="text-sm leading-6">Users may exercise these rights by contacting: <a href="mailto:privacy@recruito.com" className="text-brand-600 hover:underline">privacy@recruito.com</a></p>
        <p className="text-sm leading-6">Users also have the right to lodge a complaint with the Swedish data protection authority.</p>
      </section>

      {/* 9. Data Security */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold border-b border-border pb-3">9. Data Security</h2>
        <p className="text-sm leading-6">Recruito implements appropriate technical and organizational security measures to protect personal data, including:</p>
        <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
          <li>encrypted connections (HTTPS)</li>
          <li>secure data storage</li>
          <li>access control systems</li>
          <li>monitoring and fraud detection tools</li>
        </ul>
        <p className="text-sm leading-6">Despite these protections, no online system can guarantee absolute security.</p>
      </section>

      {/* 10. Cookie Policy */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-b border-border pb-3">10. Cookie Policy</h2>
        <p className="text-sm leading-6">Recruito uses cookies and similar technologies to improve the user experience and ensure proper platform functionality.</p>
        <p className="text-sm leading-6">Cookies are small text files stored on a user&apos;s device when visiting a website.</p>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Types of Cookies We Use</h3>

          <h4 className="font-semibold text-sm mt-3">Essential Cookies</h4>
          <p className="text-sm leading-6">These cookies are necessary for the platform to function properly. They enable features such as:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>account login</li>
            <li>session management</li>
            <li>platform security</li>
          </ul>
          <p className="text-sm leading-6">Without these cookies, the platform cannot operate.</p>

          <h4 className="font-semibold text-sm mt-3">Analytics Cookies</h4>
          <p className="text-sm leading-6">Recruito may use analytics tools to understand how users interact with the platform. These cookies may collect information such as:</p>
          <ul className="list-disc list-inside text-sm leading-6 ml-2 space-y-1">
            <li>page visits</li>
            <li>navigation patterns</li>
            <li>time spent on pages</li>
          </ul>
          <p className="text-sm leading-6">This helps improve platform performance and usability.</p>

          <h4 className="font-semibold text-sm mt-3">Preference Cookies</h4>
          <p className="text-sm leading-6">These cookies remember user preferences such as language settings or interface choices.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Managing Cookies</h3>
          <p className="text-sm leading-6">Users may manage or disable cookies through their browser settings. Disabling certain cookies may affect platform functionality.</p>
        </div>
      </section>

      {/* 11. Third-Party Links */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold border-b border-border pb-3">11. Third-Party Links</h2>
        <p className="text-sm leading-6">The Recruito platform may contain links to external websites or services. Recruito is not responsible for the privacy practices of third-party websites. Users are encouraged to review the privacy policies of those services.</p>
      </section>

      {/* 12. Children's Privacy */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold border-b border-border pb-3">12. Children&apos;s Privacy</h2>
        <p className="text-sm leading-6">Recruito services are intended for professional users and are not directed to individuals under the age of 18. Recruito does not knowingly collect personal data from minors.</p>
      </section>

      {/* 13. Updates */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold border-b border-border pb-3">13. Updates to This Policy</h2>
        <p className="text-sm leading-6">Recruito may update this Privacy &amp; Cookie Policy from time to time. If significant changes are made, users may be notified through the platform or via email. Continued use of the platform constitutes acceptance of the updated policy.</p>
      </section>

      {/* 14. Contact */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold border-b border-border pb-3">14. Contact Information</h2>
        <p className="text-sm leading-6">For privacy or data protection questions, please contact:</p>
        <p className="text-sm leading-6">
          <strong>Recruito Privacy Team</strong><br />
          Email: <a href="mailto:privacy@recruito.com" className="text-brand-600 hover:underline">privacy@recruito.com</a>
        </p>
      </section>

      {/* Footer nav */}
      <footer className="pt-6 border-t border-border flex justify-between text-sm">
        <Link href="/policy-pack" className="text-brand-600 hover:underline">&larr; Policy Pack</Link>
        <Link href="/" className="text-brand-600 hover:underline">Back to Recruito &rarr;</Link>
      </footer>
    </main>
  );
}
