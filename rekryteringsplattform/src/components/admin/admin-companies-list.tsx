"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CompanyApproveButton } from "@/components/dashboard/admin/company-approve-button";
import { useTranslations } from "@/i18n/client";
import { formatDateShort } from "@/lib/utils";

interface AdminCompany {
    id: string;
    name: string;
    industry: string;
    contact: string;
    email: string;
    jobs: number;
    hired: number;
    candidatesSubmitted: number;
    inInterview: number;
    rejectedCandidates: number;
    approvalStatus: string;
    joinedAt: string | null;
}

export function AdminCompaniesList({ companies }: { companies: AdminCompany[] }) {
    const { t } = useTranslations();
    const [search, setSearch] = useState("");

    const q = search.trim().toLowerCase();
    const visible = q
        ? companies.filter((c) =>
              `${c.name} ${c.contact} ${c.email}`.toLowerCase().includes(q),
          )
        : companies;

    const dash = t("common.noDataDash");

    return (
        <Card>
            <CardContent className="p-0 overflow-x-auto">
                <div className="border-b border-border p-4">
                    <div className="relative max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("admin.companiesSearchPlaceholder")}
                            className="pl-9"
                        />
                    </div>
                </div>
                <table className="w-full text-sm min-w-[860px]">
                    <thead>
                        <tr className="border-b border-border text-left">
                            <th className="p-4 font-medium text-muted-foreground">{t("admin.tableCompany")}</th>
                            <th className="p-4 font-medium text-muted-foreground">{t("admin.tableIndustry")}</th>
                            <th className="p-4 font-medium text-muted-foreground">{t("admin.tableJoiningDate")}</th>
                            <th className="p-4 font-medium text-muted-foreground">{t("admin.tableCandidatesSubmitted")}</th>
                            <th className="p-4 font-medium text-muted-foreground">{t("admin.tableInInterview")}</th>
                            <th className="p-4 font-medium text-muted-foreground">{t("admin.tableRejected")}</th>
                            <th className="p-4 font-medium text-muted-foreground">{t("admin.tableHired")}</th>
                            <th className="p-4 font-medium text-muted-foreground">{t("admin.tableActiveJobs")}</th>
                            <th className="p-4 font-medium text-muted-foreground">{t("admin.tableApprove")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                                    {t("admin.noCompaniesRegistered")}
                                </td>
                            </tr>
                        ) : (
                            visible.map((company) => (
                                <tr key={company.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                                    <td className="p-4">
                                        <Link href={`/admin/companies/${company.id}`} className="flex items-center gap-3 group">
                                            <div className="h-8 w-8 rounded bg-brand-50 flex items-center justify-center">
                                                <Building2 className="h-4 w-4 text-brand-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium group-hover:text-brand-600">{company.name}</p>
                                                <p className="text-xs text-muted-foreground">{company.email || t("admin.noEmail")}</p>
                                            </div>
                                        </Link>
                                    </td>
                                    <td className="p-4">
                                        {company.industry ? <Badge variant="outline">{company.industry}</Badge> : dash}
                                    </td>
                                    <td className="p-4 text-muted-foreground">
                                        {company.joinedAt ? formatDateShort(company.joinedAt) : dash}
                                    </td>
                                    <td className="p-4">{company.candidatesSubmitted}</td>
                                    <td className="p-4">{company.inInterview}</td>
                                    <td className="p-4">{company.rejectedCandidates}</td>
                                    <td className="p-4">{company.hired}</td>
                                    <td className="p-4">{company.jobs}</td>
                                    <td className="p-4">
                                        <CompanyApproveButton companyId={company.id} approvalStatus={company.approvalStatus} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}
