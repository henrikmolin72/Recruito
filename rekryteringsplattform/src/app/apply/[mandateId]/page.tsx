import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, Building2, CheckCircle2, Globe, MapPin, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/shared/app-logo";
import { PublicApplicationForm } from "@/components/public/public-application-form";
import {
  getPublicMandateApplicationContext,
  submitPublicMandateApplication,
} from "@/lib/actions/applications";

type PageProps = {
  params: Promise<{ mandateId: string }>;
  searchParams?: Promise<{ submitted?: string }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicApplyPage({ params, searchParams }: PageProps) {
  const { mandateId } = await params;
  const search = searchParams ? await searchParams : {};

  if (!UUID_RE.test(mandateId)) {
    notFound();
  }

  const context = await getPublicMandateApplicationContext(mandateId);
  if (!context) {
    notFound();
  }

  if (!context.isActive || context.jobStatus !== "active") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <AppLogo size="md" priority />
          </div>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-8 text-center space-y-3">
              <h1 className="text-2xl font-bold text-slate-900">Application link closed</h1>
              <p className="text-sm text-muted-foreground">
                This role is no longer accepting applications through this link.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isSubmitted = search?.submitted === "1";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_15%,#dbeafe,transparent_36%),radial-gradient(circle_at_85%_20%,#dcfce7,transparent_38%),linear-gradient(180deg,#f8fafc,#ffffff)] px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex justify-center">
          <Link href="/" className="inline-flex">
            <AppLogo size="md" priority />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1.3fr]">
          <div className="space-y-4">
            {/* Company branding card */}
            {context.companyName ? (
              <Card className="border-slate-200 shadow-xl shadow-slate-200/60">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    {context.companyLogoUrl ? (
                      <img
                        src={context.companyLogoUrl}
                        alt={context.companyName}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-xl object-contain border border-slate-100"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 border border-brand-100">
                        <Building2 className="h-6 w-6 text-brand-600" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{context.companyName}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {context.companyWebsite ? (
                          <a href={context.companyWebsite} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 transition-colors">
                            <Globe className="h-3 w-3" />
                            Website
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Job details card */}
            <Card className="border-slate-200 shadow-xl shadow-slate-200/60">
              <CardContent className="p-6 lg:p-7 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-700">
                  Recruito Application
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">{context.jobTitle}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    {context.companyName ? (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {context.companyName}
                      </span>
                    ) : null}
                    {context.location ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {context.location}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      Submitted to recruiter via Recruito
                    </span>
                  </div>
                </div>

                {context.jobDescription ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Role summary</p>
                    <p className="text-sm leading-6 text-slate-700 whitespace-pre-wrap">
                      {context.jobDescription.length > 900
                        ? `${context.jobDescription.slice(0, 900)}...`
                        : context.jobDescription}
                    </p>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-emerald-900">
                      <p className="font-semibold">Private recruiter submission</p>
                      <p className="mt-1 leading-5 text-emerald-800">
                        Your application is submitted directly to the recruiter handling this role. You do not need a Recruito account.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-xl shadow-slate-200/60">
            <CardContent className="p-6 lg:p-7">
              {isSubmitted ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                  <h2 className="text-xl font-bold text-emerald-900">Application submitted</h2>
                  <p className="text-sm leading-6 text-emerald-800">
                    Thank you. Your application has been sent to the recruiter.
                  </p>
                  <Badge variant="success" className="mx-auto">Received</Badge>
                </div>
              ) : (
                <>
                  <div className="mb-5">
                    <h2 className="text-xl font-bold text-slate-900">Apply for this role</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Fill in your details and paste your CV/resume text so the recruiter can review your application quickly.
                    </p>
                  </div>
                  <PublicApplicationForm
                    mandateId={mandateId}
                    action={submitPublicMandateApplication}
                    screeningQuestions={context.screeningQuestions}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
