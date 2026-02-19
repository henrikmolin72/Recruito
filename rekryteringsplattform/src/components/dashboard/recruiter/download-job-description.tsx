"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DownloadJobDescriptionProps {
    mandate: {
        title: string;
        description: string;
        company: string;
        location: string;
        industry: string;
        employment_type: string;
        salary_min?: number | null;
        salary_max?: number | null;
        salary_currency?: string;
        fee_percentage?: number | null;
    };
}

export function DownloadJobDescription({ mandate }: DownloadJobDescriptionProps) {
    const handleDownload = () => {
        const salary = mandate.salary_min
            ? `${formatCurrency(mandate.salary_min)} - ${formatCurrency(mandate.salary_max || mandate.salary_min)}`
            : "Ej angiven";

        const content = [
            mandate.title,
            "=".repeat(mandate.title.length),
            "",
            `Företag: ${mandate.company}`,
            `Plats: ${mandate.location}`,
            `Bransch: ${mandate.industry}`,
            `Anställningsform: ${mandate.employment_type}`,
            `Löneindikation: ${salary}`,
            "",
            "Arbetsbeskrivning",
            "-".repeat(18),
            "",
            mandate.description,
        ].join("\n");

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${mandate.title.replace(/[^a-zA-ZåäöÅÄÖ0-9 ]/g, "").replace(/\s+/g, "_")}_jobbeskrivning.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Ladda ner jobbeskrivning
        </Button>
    );
}
