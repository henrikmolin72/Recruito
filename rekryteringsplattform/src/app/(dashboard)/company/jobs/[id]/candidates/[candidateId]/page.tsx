import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ArrowLeft, Download, Mail, Phone, Linkedin } from "lucide-react";
import { CandidateStatusActions } from "@/components/dashboard/company/candidate-status-actions";
import { CandidateChat } from "@/components/shared/candidate-chat";
import { getCandidateConversation } from "@/lib/actions/messages";

async function getCandidate(candidateId: string, jobId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // 1. Hämta jobbet för att kontrollera att användaren äger det
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

    // 2. Hämta kandidaten
    const { data: candidate, error: candidateError } = await supabase
        .from("candidates")
        .select(`
      *,
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
                <div className="flex items-center gap-4">
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
                            Presenterades av {candidate.recruiter?.profile?.full_name || 'Rekryterare'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {cvUrl && (
                        <a href={cvUrl} target="_blank" rel="noreferrer">
                            <Button variant="outline" className="gap-2">
                                <Download className="h-4 w-4" /> Ladda ner CV
                            </Button>
                        </a>
                    )}
                    <CandidateStatusActions
                        candidateId={candidateId}
                        jobId={jobId}
                        currentStatus={candidate.status}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profil & Erfarenhet</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Nuvarande roll</p>
                                    <p className="font-semibold">{candidate.current_title || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Nuvarande arbetsgivare</p>
                                    <p className="font-semibold">{candidate.current_company || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Erfarenhet</p>
                                    <p className="font-semibold">{candidate.years_experience} år</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Löneanspråk</p>
                                    <p className="font-semibold">{candidate.expected_salary ? `${candidate.expected_salary} kr/mån` : '-'}</p>
                                </div>
                            </div>

                            <div>
                                <p className="font-medium mb-2">Motivering / Cover Note</p>
                                <div className="p-4 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap italic">
                                    "{candidate.cover_note || 'Ingen motivering angiven.'}"
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Kontaktuppgifter</CardTitle>
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
                                    <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">LinkedIn Profil</a>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="pt-6 border-t">
                <h2 className="text-xl font-bold mb-4">Meddelanden</h2>
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
