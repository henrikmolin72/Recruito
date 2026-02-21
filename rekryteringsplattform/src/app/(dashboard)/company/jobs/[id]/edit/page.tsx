import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { updateJob } from "@/lib/actions/jobs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDictionary } from "@/i18n/server";

async function getJob(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: job } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

    return job;
}

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const job = await getJob(id);

    if (!job) {
        notFound();
    }

    const dict = await getDictionary();
    const c = dict.company;
    const emp = dict.employment;

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href={`/company/jobs/${id}`}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">{c.editJobTitle}</h1>
                    <p className="text-muted-foreground">{c.editJobSubtitle.replace("{title}", job.title)}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{c.jobDetails}</CardTitle>
                    <CardDescription>{c.jobDetailsChangeDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        action={async (formData) => {
                            "use server";
                            await updateJob(id, formData);
                        }}
                        className="space-y-6"
                    >
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{c.jobTitleLabel}</label>
                                <Input name="title" defaultValue={job.title} required />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">{c.roleDescriptionLabel}</label>
                                <textarea
                                    name="description"
                                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    defaultValue={job.description}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{c.locationLabel}</label>
                                    <Input name="location" defaultValue={job.location} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{c.industryLabel}</label>
                                    <Input name="industry" defaultValue={job.industry} required />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{c.employmentTypeSelectLabel}</label>
                                    <select
                                        name="employment_type"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        defaultValue={job.employment_type}
                                    >
                                        <option value="Heltid">{emp.fullTime}</option>
                                        <option value="Deltid">{emp.partTime}</option>
                                        <option value="Konsult">{emp.consultant}</option>
                                        <option value="Frilans">{emp.freelance}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{c.maxRecruitersLabel}</label>
                                    <Input type="number" name="max_recruiters" defaultValue={job.max_recruiters} min="1" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">{c.compensationLabel}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <Input type="number" name="salary_min" defaultValue={job.salary_min || ''} />
                                    <Input type="number" name="salary_max" defaultValue={job.salary_max || ''} />
                                    <select
                                        name="salary_currency"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        defaultValue={job.salary_currency || 'SEK'}
                                    >
                                        <option value="SEK">SEK</option>
                                        <option value="EUR">EUR</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">{c.recruitmentFeeLabel}</label>
                                <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted">
                                    <span className="text-sm font-semibold">{job.fee_percentage}%</span>
                                    <span className="ml-2 text-xs text-muted-foreground">{c.feeSetAtCreation}</span>
                                </div>
                                <input type="hidden" name="fee_percentage" value={job.fee_percentage} />
                            </div>

                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Link href={`/company/jobs/${id}`}>
                                <Button variant="outline" type="button">{dict.common.cancel}</Button>
                            </Link>
                            <Button type="submit">{dict.common.saveChanges}</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
