import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ArrowLeft, Download, Mail, Phone, Linkedin } from "lucide-react";
import { CandidateNextStepRequestActions } from "@/components/dashboard/company/candidate-next-step-request-actions";
import { CandidateChat } from "@/components/shared/candidate-chat";
import { CandidateProcessFlowchart } from "@/components/shared/candidate-process-flowchart";
import { getCandidateConversation } from "@/lib/actions/messages";
import { getDictionary } from "@/i18n/server";
import { SkillTagEditor } from "@/components/skills/skill-tag-editor";

async function getCandidate(candidateId: string, jobId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: job } = await supabase
        .from("jobs")
        .select("company:companies(user_id)")
        .eq("id", jobId)
        .single();

    const companyData = job?.company;
    const jobOwnerId = Array.isArray(companyData) ? companyData[0]?.user_id : (companyData as any)?.user_id;
    if (jobOwnerId !== user.id) {
        console.error("Access denied: User is not job owner");
        return null;
    }

    const { data: candidate, error: candidateError } = await supabase
        .from("candidates")
        .select(`
      *,
      job:jobs(
        title,
        pipeline_stages
      ),
      recruiter:recruiters(
        headline,
        profile:profiles!recruiters_user_id_fkey(full_name)
      )
    `)
        .eq("id", candidateId)
        .single();

    if (candidateError) {
        console.error("Candidate fetch error:", candidateError);
    }

    return candidate;
}

export default async function CandidateDetailsPage({ params }: { params: Promise<{ id: string, candidateId: string }> }) {
    const { id: jobId, candidateId } = await params;
    const candidate = await getCandidate(candidateId, jobId);

    if (!candidate) {
        notFound();
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const conversation = await getCandidateConversation(candidateId);
    const initialMessages = (conversation as any)?.messages || [];
    const dict = await getDictionary();
    const c = dict.company;

    let cvUrl = null;
    if (candidate.cv_file_path) {
        try {
            const { data, error } = await supabase.storage
                .from('cvs')
                .createSignedUrl(candidate.cv_file_path, 3600);

            if (!error) cvUrl = data?.signedUrl;
        } catch (e) {
            console.error("Storage error:", e);
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                    <Link href={`/company/jobs/${jobId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{candidate.first_name} {candidate.last_name}</h1>
                            <StatusBadge status={candidate.status} />
                        </div>
                        <p className="text-muted-foreground mt-1">
                            {c.presentedBy.replace("{name}", candidate.recruiter?.profile?.full_name || dict.common.recruiter)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {cvUrl && (
                        <a href={cvUrl} target="_blank" rel="noreferrer">
                            <Button variant="outline" className="gap-2">
                                <Download className="h-4 w-4" /> {c.downloadCv}
                            </Button>
                        </a>
                    )}
                    <CandidateNextStepRequestActions
                        candidateId={candidateId}
                        jobId={jobId}
                        currentRequest={candidate.company_requested_next_step}
                        currentRequestNote={candidate.company_requested_next_step_note}
                        currentRequestAt={candidate.company_requested_next_step_at}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <CandidateProcessFlowchart
                        candidate={candidate}
                        dict={dict}
                        eyebrow="Kandidatens process"
                        helperText="Uppdateras av rekryteraren när kandidaten flyttas i processen."
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>{c.candidateProfileTitle}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">{c.currentRole}</p>
                                    <p className="font-semibold">{candidate.current_title || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">{c.currentEmployer}</p>
                                    <p className="font-semibold">{candidate.current_company || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">{c.experience}</p>
                                    <p className="font-semibold">{candidate.years_experience} {dict.common.years}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">{c.salaryExpectation}</p>
                                    <p className="font-semibold">{candidate.expected_salary ? `${candidate.expected_salary} ${dict.common.perMonth}` : '-'}</p>
                                </div>
                            </div>

                            <div>
                                <p className="font-medium mb-2">{c.motivationTitle}</p>
                                <div className="p-4 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap italic">
                                    &quot;{candidate.cover_note || c.noMotivationProvided}&quot;
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{c.contactInfoTitle}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a href={`mailto:${candidate.email}`} className="text-sm hover:underline">{candidate.email}</a>
                            </div>
                            {candidate.phone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{candidate.phone}</span>
                                </div>
                            )}
                            {candidate.linkedin_url && (
                                <div className="flex items-center gap-3">
                                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                                    <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">{dict.common.linkedInProfile}</a>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-5">
                            <SkillTagEditor candidateId={candidateId} readOnly />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="pt-6 border-t">
                <h2 className="text-xl font-bold mb-4">{c.candidateMessagesTitle}</h2>
                <CandidateChat
                    candidateId={candidateId}
                    jobId={jobId}
                    initialMessages={initialMessages}
                    currentUserId={user?.id || ''}
                    candidate={candidate}
                />
            </div>
        </div>
    );
}
