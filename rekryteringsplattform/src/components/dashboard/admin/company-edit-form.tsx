"use client";

import { useState } from "react";
import { updateAdminCompany } from "@/lib/actions/admin";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
    companyId: string;
    initial: {
        company_name: string;
        org_number: string;
        description: string;
        industry: string;
        website: string;
        logo_url: string;
        city: string;
        country: string;
        employee_count: string;
        billing_email: string;
        billing_address: string;
        is_verified: boolean;
        contact_full_name: string;
        contact_phone: string;
    };
    labels: {
        companyName: string;
        orgNumber: string;
        description: string;
        industry: string;
        website: string;
        logoUrl: string;
        city: string;
        country: string;
        employeeCount: string;
        billingEmail: string;
        billingAddress: string;
        isVerified: string;
        contactFullName: string;
        contactPhone: string;
        save: string;
        saving: string;
        saved: string;
    };
}

export function CompanyEditForm({ companyId, initial, labels }: Props) {
    const [form, setForm] = useState(initial);
    const [saving, setSaving] = useState(false);

    function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    async function handleSave() {
        setSaving(true);
        const result = await updateAdminCompany(companyId, form);
        setSaving(false);
        if (result?.error) toast.error(result.error);
        else toast.success(labels.saved);
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <Field label={labels.companyName}>
                    <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
                </Field>
                <Field label={labels.orgNumber}>
                    <Input value={form.org_number} onChange={(e) => set("org_number", e.target.value)} />
                </Field>
                <Field label={labels.industry}>
                    <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} />
                </Field>
                <Field label={labels.website}>
                    <Input value={form.website} onChange={(e) => set("website", e.target.value)} />
                </Field>
                <Field label={labels.logoUrl}>
                    <Input value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} />
                </Field>
                <Field label={labels.employeeCount}>
                    <Input value={form.employee_count} onChange={(e) => set("employee_count", e.target.value)} />
                </Field>
                <Field label={labels.city}>
                    <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
                <Field label={labels.country}>
                    <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
                </Field>
            </div>
            <Field label={labels.description}>
                <Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>

            <div className="border-t border-border pt-4 grid gap-4 md:grid-cols-2">
                <Field label={labels.billingEmail}>
                    <Input type="email" value={form.billing_email} onChange={(e) => set("billing_email", e.target.value)} />
                </Field>
                <Field label={labels.billingAddress}>
                    <Input value={form.billing_address} onChange={(e) => set("billing_address", e.target.value)} />
                </Field>
                <Field label={labels.contactFullName}>
                    <Input value={form.contact_full_name} onChange={(e) => set("contact_full_name", e.target.value)} />
                </Field>
                <Field label={labels.contactPhone}>
                    <Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
                </Field>
            </div>

            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={form.is_verified}
                    onChange={(e) => set("is_verified", e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                />
                <span>{labels.isVerified}</span>
            </label>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? labels.saving : labels.save}
                </Button>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {children}
        </label>
    );
}
