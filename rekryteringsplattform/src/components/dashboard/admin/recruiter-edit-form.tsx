"use client";

import { useState } from "react";
import { updateAdminRecruiter } from "@/lib/actions/admin";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
    recruiterId: string;
    initial: {
        full_name: string;
        phone: string;
        headline: string;
        bio: string;
        specializations: string[];
        locations: string[];
        years_experience: number | null;
        linkedin_url: string;
    };
    labels: {
        fullName: string;
        phone: string;
        headline: string;
        bio: string;
        specializations: string;
        locations: string;
        yearsExperience: string;
        linkedinUrl: string;
        save: string;
        saving: string;
        saved: string;
        commaHint: string;
    };
}

export function RecruiterEditForm({ recruiterId, initial, labels }: Props) {
    const [form, setForm] = useState({
        full_name: initial.full_name,
        phone: initial.phone,
        headline: initial.headline,
        bio: initial.bio,
        specializations: initial.specializations.join(", "),
        locations: initial.locations.join(", "),
        years_experience: initial.years_experience?.toString() ?? "",
        linkedin_url: initial.linkedin_url,
    });
    const [saving, setSaving] = useState(false);

    function set<K extends keyof typeof form>(key: K, value: string) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    function splitCsv(s: string): string[] {
        return s.split(",").map((x) => x.trim()).filter(Boolean);
    }

    async function handleSave() {
        setSaving(true);
        const yrsStr = form.years_experience.trim();
        const yrs = yrsStr === "" ? null : parseInt(yrsStr, 10);
        const result = await updateAdminRecruiter(recruiterId, {
            full_name: form.full_name,
            phone: form.phone,
            headline: form.headline,
            bio: form.bio,
            specializations: splitCsv(form.specializations),
            locations: splitCsv(form.locations),
            years_experience: yrs,
            linkedin_url: form.linkedin_url,
        });
        setSaving(false);
        if (result?.error) toast.error(result.error);
        else toast.success(labels.saved);
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <Field label={labels.fullName}>
                    <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                </Field>
                <Field label={labels.phone}>
                    <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </Field>
                <Field label={labels.headline}>
                    <Input value={form.headline} onChange={(e) => set("headline", e.target.value)} />
                </Field>
                <Field label={labels.yearsExperience}>
                    <Input
                        type="number"
                        min={0}
                        max={80}
                        value={form.years_experience}
                        onChange={(e) => set("years_experience", e.target.value)}
                    />
                </Field>
                <Field label={labels.linkedinUrl}>
                    <Input value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} />
                </Field>
            </div>
            <Field label={labels.bio}>
                <Textarea rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
            </Field>
            <Field label={`${labels.specializations} (${labels.commaHint})`}>
                <Input value={form.specializations} onChange={(e) => set("specializations", e.target.value)} />
            </Field>
            <Field label={`${labels.locations} (${labels.commaHint})`}>
                <Input value={form.locations} onChange={(e) => set("locations", e.target.value)} />
            </Field>
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
