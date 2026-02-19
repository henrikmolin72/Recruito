import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ArrowLeft, Mail, Phone, Linkedin, FileText } from "lucide-react";
import { CandidateChat } from "@/components/shared/candidate-chat";
import { getCandidateConversation } from "@/lib/actions/messages";

async function getCandidate(candidateId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: candidate } = await supabase
        .from("candidates")
        .select(`
            *,
            job:jobs(
                title,
                company:companies(company_name)
            )
        `)
        .eq("id", candidateId)
        .single();

    return candidate;
}

export default async function RecruiterCandidateDetailsPage({ params }: { params: Promise<{ id: string, candidateId: string }> }) {
    const { id: mandateId, candidateId } = await params;
    const candidate = await getCandidate(candidateId);

    if (!candidate) {
        notFound();
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const conversation = await getCandidateConversation(candidateId);
    const initialMessages = (conversation as any)?.messages || [];

    return (
        <div className="space-y-8 max-w-5xl mx-auto py-2">
            {/* Header */}
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between border-b pb-8 border-slate-100">
                <div className="flex items-start gap-5">
                    <Link href="/recruiter/mandates">
                        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-slate-100">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">
                                {candidate.first_name} {candidate.last_name}
                            </h1>
                            <StatusBadge status={candidate.status} />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                            <span className="text-slate-400">Uppdrag:</span>
                            <span className="text-brand-600 font-bold">{candidate.job?.title || "Okänt jobb"}</span>
                            <span className="text-slate-300">•</span>
                            <span>{(candidate.job?.company as any)?.company_name || "Okänt företag"}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Chat Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
                            Diskussion med kund
                        </h3>
                        <CandidateChat
                            candidateId={candidateId}
                            jobId={candidate.job_id}
                            initialMessages={initialMessages}
                            currentUserId={user?.id || ''}
                            candidate={candidate}
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
                        <CardHeader className="pb-2">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profilöversikt</h3>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                        <Mail className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{candidate.email}</span>
                                </div>
                                {candidate.phone && (
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                            <Phone className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-700">{candidate.phone}</span>
                                    </div>
                                )}
                                {candidate.linkedin_url && (
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                            <Linkedin className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-brand-600 hover:underline">LinkedIn Profil</a>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-50 space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nuvarande roll</p>
                                    <p className="text-sm font-bold text-slate-700">{candidate.current_title || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Erfarenhet</p>
                                    <p className="text-sm font-bold text-slate-700">{candidate.years_experience} år</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Löneanspråk</p>
                                    <p className="text-sm font-bold text-slate-700">{candidate.expected_salary ? `${candidate.expected_salary} kr/mån` : '-'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-slate-900 text-white overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <FileText className="h-5 w-5 text-brand-400" />
                                <h3 className="font-bold">Din motivering</h3>
                            </div>
                            <p className="text-sm text-slate-400 italic leading-relaxed">
                                &quot;{candidate.cover_note || 'Ingen motivering angiven.'}&quot;
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
