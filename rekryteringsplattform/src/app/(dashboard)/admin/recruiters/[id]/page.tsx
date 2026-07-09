import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { getAdminRecruiterById } from "@/lib/actions/admin";
import { RecruiterEditForm } from "@/components/dashboard/admin/recruiter-edit-form";
import { RecruiterApprovalActions, RecruiterManageActions } from "@/components/dashboard/admin/recruiter-approval-actions";
import { getDictionary } from "@/i18n/server";

export default async function AdminRecruiterDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const recruiter = await getAdminRecruiterById(id);
    if (!recruiter) notFound();

    const dict = await getDictionary();
    const a = dict.admin;

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Link href="/admin/recruiters" className="text-sm text-muted-foreground hover:text-foreground">
                        ← {a.recruitersPageTitle}
                    </Link>
                    <h1 className="mt-2 text-2xl font-bold">{recruiter.full_name || a.tableRecruiter}</h1>
                    <p className="text-muted-foreground">{recruiter.email}</p>
                </div>
                <div>
                    {recruiter.approval_status === "pending" ? (
                        <RecruiterApprovalActions recruiterId={recruiter.id} />
                    ) : (
                        <RecruiterManageActions recruiterId={recruiter.id} status={recruiter.approval_status} />
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{a.tableStatusColumn}</p>
                    <Badge variant={recruiter.approval_status === "approved" ? "success" : recruiter.approval_status === "pending" ? "warning" : "danger"}>
                        {recruiter.approval_status === "approved" ? a.statusApproved : recruiter.approval_status === "pending" ? a.statusPending : recruiter.approval_status === "rejected" ? a.statusRejected : a.statusSuspended}
                    </Badge>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{a.tablePlacements}</p>
                    <p className="mt-1 text-2xl font-bold">{recruiter.total_placements}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{a.tableRating}</p>
                    {recruiter.rating > 0 ? (
                        <div className="mt-1 flex items-center gap-1">
                            <Star className="h-4 w-4 fill-warning-500 text-warning-500" />
                            <span className="text-2xl font-bold">{recruiter.rating}</span>
                        </div>
                    ) : <p className="mt-1 text-muted-foreground">{dict.common.noDataDash}</p>}
                </CardContent></Card>
            </div>

            <Card><CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold">{a.editProfile}</h2>
                <RecruiterEditForm
                    recruiterId={recruiter.id}
                    initial={{
                        full_name: recruiter.full_name,
                        phone: recruiter.phone,
                        headline: recruiter.headline,
                        bio: recruiter.bio,
                        specializations: recruiter.specializations,
                        locations: recruiter.locations,
                        years_experience: recruiter.years_experience,
                        linkedin_url: recruiter.linkedin_url,
                    }}
                    labels={{
                        fullName: a.fieldFullName,
                        phone: a.fieldPhone,
                        headline: a.fieldHeadline,
                        bio: a.fieldBio,
                        specializations: a.fieldSpecializations,
                        locations: a.fieldLocations,
                        yearsExperience: a.fieldYearsExperience,
                        linkedinUrl: a.fieldLinkedinUrl,
                        save: a.saveButton,
                        saving: a.savingButton,
                        saved: a.savedToast,
                        commaHint: a.commaSeparatedHint,
                    }}
                />
            </CardContent></Card>

            <Card><CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold">{a.relatedJobs}</h2>
                {recruiter.mandates.length === 0 ? (
                    <p className="text-muted-foreground">{a.noRelatedJobs}</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {recruiter.mandates.map((m) => (
                            <li key={m.id} className="py-2 flex items-center justify-between">
                                <div>
                                    <Link href="/admin/jobs" className="font-medium hover:underline">{m.jobTitle}</Link>
                                    <p className="text-xs text-muted-foreground">{m.companyName}</p>
                                </div>
                                <Badge variant={m.isActive ? "success" : "outline"}>{m.isActive ? a.statusApproved : "—"}</Badge>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent></Card>

            <Card><CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold">{a.placementsPageTitle}</h2>
                {recruiter.placements.length === 0 ? (
                    <p className="text-muted-foreground">{a.noPlacementsYet}</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {recruiter.placements.map((p) => (
                            <li key={p.id} className="py-2 flex items-center justify-between">
                                <div>
                                    <Link href="/admin/guarantees" className="font-medium hover:underline">{p.jobTitle}</Link>
                                    <p className="text-xs text-muted-foreground">{p.companyName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">{p.recruiterFee.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">{p.status}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent></Card>
        </div>
    );
}
