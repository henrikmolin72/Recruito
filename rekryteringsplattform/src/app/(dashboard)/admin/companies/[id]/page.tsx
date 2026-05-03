import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { getAdminCompanyById } from "@/lib/actions/admin";
import { CompanyEditForm } from "@/components/dashboard/admin/company-edit-form";
import { getDictionary } from "@/i18n/server";

export default async function AdminCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const company = await getAdminCompanyById(id);
    if (!company) notFound();

    const dict = await getDictionary();
    const a = dict.admin;

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin/companies" className="text-sm text-muted-foreground hover:text-foreground">
                    ← {a.companiesPageTitle}
                </Link>
                <div className="mt-2 flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-brand-50 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-brand-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{company.company_name || a.tableCompany}</h1>
                        <p className="text-muted-foreground">{company.contact.email}</p>
                    </div>
                    {company.is_verified && <Badge variant="success">{a.verifiedBadge}</Badge>}
                </div>
            </div>

            <Card><CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold">{a.editCompany}</h2>
                <CompanyEditForm
                    companyId={company.id}
                    initial={{
                        company_name: company.company_name,
                        org_number: company.org_number,
                        description: company.description,
                        industry: company.industry,
                        website: company.website,
                        logo_url: company.logo_url,
                        city: company.city,
                        country: company.country,
                        employee_count: company.employee_count,
                        billing_email: company.billing_email,
                        billing_address: company.billing_address,
                        is_verified: company.is_verified,
                        contact_full_name: company.contact.full_name,
                        contact_phone: company.contact.phone,
                    }}
                    labels={{
                        companyName: a.fieldCompanyName,
                        orgNumber: a.tableOrgNumber,
                        description: a.fieldDescription,
                        industry: a.tableIndustry,
                        website: a.fieldWebsite,
                        logoUrl: a.fieldLogoUrl,
                        city: a.fieldCity,
                        country: a.fieldCountry,
                        employeeCount: a.fieldEmployeeCount,
                        billingEmail: a.fieldBillingEmail,
                        billingAddress: a.fieldBillingAddress,
                        isVerified: a.fieldIsVerified,
                        contactFullName: a.fieldContactFullName,
                        contactPhone: a.fieldContactPhone,
                        save: a.saveButton,
                        saving: a.savingButton,
                        saved: a.savedToast,
                    }}
                />
            </CardContent></Card>

            <Card><CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold">{a.relatedJobs}</h2>
                {company.jobs.length === 0 ? (
                    <p className="text-muted-foreground">{a.noJobsRegistered}</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {company.jobs.map((j) => (
                            <li key={j.id} className="py-2 flex items-center justify-between">
                                <div>
                                    <Link href="/admin/jobs" className="font-medium hover:underline">{j.title}</Link>
                                    <p className="text-xs text-muted-foreground">{j.location}</p>
                                </div>
                                <Badge variant="outline">{j.status}</Badge>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent></Card>

            <Card><CardContent className="p-6">
                <h2 className="mb-4 text-lg font-semibold">{a.placementsPageTitle}</h2>
                {company.placements.length === 0 ? (
                    <p className="text-muted-foreground">{a.noPlacementsYet}</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {company.placements.map((p) => (
                            <li key={p.id} className="py-2 flex items-center justify-between">
                                <Link href="/admin/placements" className="font-medium hover:underline">{p.jobTitle}</Link>
                                <div className="text-right">
                                    <p className="font-medium">{p.totalFee.toLocaleString()}</p>
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
