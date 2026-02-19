import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, UserPlus, Info, Sparkles } from "lucide-react";
import { createCandidate } from "@/lib/actions/candidates";
import { CVPreview } from "@/components/dashboard/recruiter/cv-preview";

async function getMandate(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: mandate } = await supabase
        .from("job_mandates")
        .select(`
      id,
      job:jobs(
        title,
        company:companies(company_name)
      )
    `)
        .eq("id", id)
        .single();

    return mandate;
}

export default async function NewCandidatePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const mandate: any = await getMandate(id);

    if (!mandate) {
        notFound();
    }

    const job = mandate.job;
    const company = Array.isArray(job.company) ? job.company[0] : job.company;

    return (
        <div className="space-y-8 max-w-4xl mx-auto py-2">
            {/* Header */}
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between border-b pb-8 border-slate-100">
                <div className="flex items-start gap-5">
                    <Link href="/recruiter/mandates">
                        <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-slate-100">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="space-y-1.5">
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">Presentera kandidat</h1>
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                            <span className="text-slate-400">Uppdrag:</span>
                            <span className="text-brand-600 font-bold">{job.title}</span>
                            <span className="text-slate-300">•</span>
                            <span>{company?.company_name}</span>
                        </div>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">Kandidatpresentation</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2">
                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
                        <CardContent className="p-8">
                            <form
                                action={async (formData) => {
                                    "use server";
                                    await createCandidate(id, formData);
                                }}
                                className="space-y-8"
                            >
                                <div className="space-y-6">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <UserPlus className="h-4 w-4" /> Basuppgifter
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Förnamn *</label>
                                            <Input name="first_name" required placeholder="t.ex. Anna" className="h-12 bg-slate-50/50 border-slate-100 focus:bg-white transition-all" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Efternamn *</label>
                                            <Input name="last_name" required placeholder="t.ex. Andersson" className="h-12 bg-slate-50/50 border-slate-100 focus:bg-white transition-all" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">E-post *</label>
                                            <Input type="email" name="email" required placeholder="anna@email.com" className="h-12 bg-slate-50/50 border-slate-100 focus:bg-white transition-all" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Telefon</label>
                                            <Input type="tel" name="phone" placeholder="+46 70 000 00 00" className="h-12 bg-slate-50/50 border-slate-100 focus:bg-white transition-all" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">LinkedIn Profile URL</label>
                                        <Input type="url" name="linkedin_url" placeholder="https://linkedin.com/in/..." className="h-12 bg-slate-50/50 border-slate-100 focus:bg-white transition-all" />
                                    </div>
                                </div>

                                <div className="space-y-6 pt-4">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <Sparkles className="h-4 w-4" /> Erfarenhet & Matchning
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nuvarande titel</label>
                                            <Input name="current_title" placeholder="t.ex. Senior Utvecklare" className="h-12 bg-slate-50/50 border-slate-100 focus:bg-white transition-all" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nuvarande arbetsgivare</label>
                                            <Input name="current_company" placeholder="t.ex. Företag AB" className="h-12 bg-slate-50/50 border-slate-100 focus:bg-white transition-all" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Erfarenhet (år)</label>
                                            <Input type="number" name="years_experience" min="0" placeholder="5" className="h-12 bg-slate-50/50 border-slate-100 focus:bg-white transition-all" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Löneanspråk</label>
                                            <Input type="number" name="expected_salary" placeholder="55000" className="h-12 bg-slate-50/50 border-slate-100 focus:bg-white transition-all" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Kort motivering / Cover Note</label>
                                        <Textarea
                                            name="cover_note"
                                            className="min-h-[120px] bg-slate-50/50 border-slate-100 focus:bg-white transition-all rounded-xl"
                                            placeholder="Beskriv briefly varför kandidaten passar för just denna roll..."
                                        />
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Curriculum Vitae (PDF) *</label>
                                        <CVPreview />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-8 border-t border-slate-50">
                                    <Link href="/recruiter/mandates">
                                        <Button variant="ghost" type="button" className="h-12 px-8 rounded-xl">Avbryt</Button>
                                    </Link>
                                    <Button type="submit" className="h-12 px-10 rounded-xl bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20">
                                        Presentera kandidat
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Tips */}
                <div className="space-y-6">
                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-gradient-to-br from-brand-500 to-brand-700 text-white overflow-hidden">
                        <CardContent className="p-6 relative">
                            <div className="relative z-10">
                                <h3 className="text-lg font-bold mb-4">Tips för presentation</h3>
                                <ul className="space-y-4 text-sm text-brand-50 font-medium">
                                    <li className="flex gap-3">
                                        <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                                        Se till att CV:t är avidentifierat om kunden kräver det.
                                    </li>
                                    <li className="flex gap-3">
                                        <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                                        En stark motivering ökar chansen för intervju med 40%.
                                    </li>
                                    <li className="flex gap-3">
                                        <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                                        Dubbelkolla löneanspråk mot kundens budget.
                                    </li>
                                </ul>
                            </div>
                            <div className="absolute -right-8 -bottom-8 opacity-10">
                                <Sparkles className="h-32 w-32" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
                        <CardContent className="p-6">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Om processen</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                När du skickar in en kandidat får kunden en notis direkt. Om de är intresserade startar en chatt mellan dig och dem i plattformen.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
