import { ShieldCheck, Eye, Brain, Scale, FileText, UserCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AiPolicyContentProps {
    role: "company" | "recruiter";
}

export function AiPolicyContent({ role }: AiPolicyContentProps) {
    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-blue-600" />
                    AI Screening Policy & Transparency
                </h1>
                <p className="text-muted-foreground mt-1">
                    How Recruito uses AI in the recruitment process — in compliance with the EU AI Act.
                </p>
            </div>

            {/* Overview */}
            <Card className="border-blue-200 bg-blue-50/30">
                <CardContent className="p-6 space-y-3">
                    <h2 className="text-base font-bold flex items-center gap-2">
                        <Brain className="h-4 w-4 text-blue-600" /> What the AI does
                    </h2>
                    <p className="text-sm text-slate-700 leading-relaxed">
                        Recruito uses AI (powered by Anthropic Claude) to assist recruiters in screening candidates
                        against job descriptions. The AI reads the candidate&apos;s CV and compares it to the job
                        requirements, producing a match score (0–100), key reasoning points, and a list of
                        missing skills.
                    </p>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-800 font-semibold">
                            The AI screening is decision support only — it never makes hiring decisions.
                            All candidate progression through the pipeline requires explicit human action.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* What data is used */}
            <Card>
                <CardContent className="p-6 space-y-3">
                    <h2 className="text-base font-bold flex items-center gap-2">
                        <Eye className="h-4 w-4 text-brand-600" /> What data the AI sees
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                            <p className="font-bold text-green-800 mb-2">The AI receives:</p>
                            <ul className="space-y-1.5 text-green-700">
                                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" /> Job title and description</li>
                                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" /> Job requirements and key skills</li>
                                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" /> Candidate CV text</li>
                                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" /> Cover letter (if provided)</li>
                            </ul>
                        </div>
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                            <p className="font-bold text-red-800 mb-2">The AI does NOT see:</p>
                            <ul className="space-y-1.5 text-red-700">
                                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" /> Gender or sex</li>
                                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" /> Age or date of birth</li>
                                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" /> Ethnicity or nationality</li>
                                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" /> Disability status</li>
                                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" /> Photograph or profile picture</li>
                                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" /> Salary history</li>
                            </ul>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        Note: While CV text may indirectly contain some demographic information (e.g. university names,
                        graduation dates), the AI is instructed to evaluate only professional qualifications and skills.
                    </p>
                </CardContent>
            </Card>

            {/* Human oversight */}
            <Card>
                <CardContent className="p-6 space-y-3">
                    <h2 className="text-base font-bold flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-brand-600" /> Human oversight
                    </h2>
                    <div className="text-sm text-slate-700 space-y-3 leading-relaxed">
                        <p>
                            <span className="font-bold">Human-in-the-loop requirement:</span> The AI screening system
                            cannot autonomously move candidates through the recruitment pipeline. Every stage transition
                            — from initial review to interview scheduling to offer — requires a human recruiter to
                            explicitly approve the action.
                        </p>
                        <p>
                            <span className="font-bold">Override capability:</span> Recruiters can always override
                            AI recommendations. A candidate with a low AI score can still be progressed, and a
                            candidate with a high score can still be rejected — the final decision is always human.
                        </p>
                        {role === "company" && (
                            <p>
                                <span className="font-bold">Company visibility:</span> As a company, you can see
                                which candidates were AI-screened, their scores, and the transparency report for
                                each screening. You can request the full audit log for any job posting.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Bias monitoring */}
            <Card>
                <CardContent className="p-6 space-y-3">
                    <h2 className="text-base font-bold flex items-center gap-2">
                        <Scale className="h-4 w-4 text-brand-600" /> Bias monitoring
                    </h2>
                    <div className="text-sm text-slate-700 space-y-3 leading-relaxed">
                        <p>
                            Recruito monitors aggregated screening outcomes per job posting to detect potential
                            bias patterns. We track:
                        </p>
                        <ul className="space-y-1.5 ml-4">
                            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" /> Score distribution across all candidates per job</li>
                            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" /> Experience level distribution (screened vs. shortlisted)</li>
                            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" /> Geographic distribution of candidates</li>
                        </ul>
                        <p>
                            If a significant skew is detected (deviation &gt;20% from expected distribution), the
                            system flags the job for admin review. Bias reports are available to companies and
                            platform administrators.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Audit trail */}
            <Card>
                <CardContent className="p-6 space-y-3">
                    <h2 className="text-base font-bold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-brand-600" /> Audit trail & data retention
                    </h2>
                    <div className="text-sm text-slate-700 space-y-3 leading-relaxed">
                        <p>
                            Every AI screening is logged with a complete audit trail including:
                        </p>
                        <ul className="space-y-1.5 ml-4">
                            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" /> AI model and version used</li>
                            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" /> Cryptographic hash of the prompt (for reproducibility)</li>
                            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" /> Timestamp and actor (who initiated the screening)</li>
                            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" /> Score, reasoning, and identified skill gaps</li>
                            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" /> Human reviewer (when reviewed)</li>
                        </ul>
                        <p>
                            Audit records are retained for a minimum of 3 years to comply with EU AI Act
                            documentation requirements (Article 12). Records can be exported in CSV format
                            by platform administrators upon request.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Right to contest */}
            <Card className="border-slate-300">
                <CardContent className="p-6 space-y-3">
                    <h2 className="text-base font-bold">Right to contest an AI decision</h2>
                    <div className="text-sm text-slate-700 space-y-3 leading-relaxed">
                        <p>
                            Under the EU AI Act and GDPR, candidates have the right to:
                        </p>
                        <ul className="space-y-1.5 ml-4">
                            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" /> Be informed that AI was used in the screening process</li>
                            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" /> Request a human review of any AI-assisted decision</li>
                            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" /> Receive an explanation of how the AI evaluation was performed</li>
                            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" /> Contest the outcome and have it reconsidered by a person</li>
                        </ul>
                        <p>
                            To exercise these rights, candidates or their representatives can contact us
                            at <a href="mailto:compliance@recruito.se" className="text-brand-600 font-semibold hover:underline">compliance@recruito.se</a>.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <p className="text-xs text-slate-400 text-center pb-4">
                Last updated: April 2026 &middot; Recruito AI Compliance Framework v1.0
            </p>
        </div>
    );
}
