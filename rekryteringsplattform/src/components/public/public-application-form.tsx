"use client";

import { useActionState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PublicApplicationFormState } from "@/lib/actions/applications";

type PublicApplicationFormProps = {
  mandateId: string;
  action: (
    prevState: PublicApplicationFormState,
    formData: FormData
  ) => Promise<PublicApplicationFormState>;
  screeningQuestions?: string[];
};

const INITIAL_STATE: PublicApplicationFormState = {};

export function PublicApplicationForm({ mandateId, action, screeningQuestions = [] }: PublicApplicationFormProps) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="mandate_id" value={mandateId} />

      {/* Honeypot */}
      <div className="hidden" aria-hidden="true">
        <label>
          Company Website
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state?.error ? (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-900">Full Name</label>
          <Input name="full_name" required placeholder="Jane Doe" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">Email</label>
          <Input type="email" name="email" placeholder="jane@example.com" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-900">Phone</label>
          <Input name="phone" placeholder="+46 70 000 00 00" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-900">LinkedIn Profile</label>
          <Input name="linkedin_url" placeholder="https://linkedin.com/in/..." />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-900">Paste your CV / Resume text (required)</label>
          <Textarea
            name="cv_text"
            required
            className="min-h-[220px]"
            placeholder="Paste your CV or resume text here. This helps the recruiter review and screen your application faster."
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Tip: Paste the full CV text. Optional file upload can be added below.
          </p>
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-900">Cover Letter (optional)</label>
          <Textarea
            name="cover_letter_text"
            className="min-h-[120px]"
            placeholder="Short motivation or context for your application (optional)"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-slate-900">CV File (optional)</label>
          <input
            type="file"
            name="cv_file"
            accept=".pdf,.doc,.docx,.txt,.rtf"
            className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-brand-700 hover:file:bg-brand-100"
          />
          <p className="mt-1 text-xs text-muted-foreground">Max 10 MB. PDF, DOC, DOCX, TXT or RTF.</p>
        </div>
      </div>

      {/* Screening questions */}
      {screeningQuestions.length > 0 ? (
        <div className="space-y-4 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
          <p className="text-sm font-semibold text-slate-900">Screening Questions</p>
          <p className="text-xs text-muted-foreground -mt-2">
            Please answer the following questions from the hiring team.
          </p>
          {screeningQuestions.map((question, idx) => (
            <div key={idx}>
              <label className="mb-1.5 block text-sm font-medium text-slate-800">
                {idx + 1}. {question}
              </label>
              <Textarea
                name={`screening_${idx}`}
                className="min-h-[80px]"
                placeholder="Your answer..."
              />
            </div>
          ))}
        </div>
      ) : null}

      {/* Consent / Declaration */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consent_given"
            required
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-xs leading-5 text-slate-700">
            I consent to my personal data and application being shared with the recruiter and the hiring company for
            the purpose of evaluating my candidacy for this role. My data will be processed in accordance with
            applicable data protection regulations. I understand I can request deletion of my data at any time.
          </span>
        </label>
      </div>

      <Button type="submit" size="lg" disabled={isPending} className="w-full gap-2 bg-brand-600 hover:bg-brand-700">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {isPending ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
}
