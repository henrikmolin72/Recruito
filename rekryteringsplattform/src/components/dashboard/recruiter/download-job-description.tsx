"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useTranslations } from "@/i18n/client";

// Client request 2026-07-10: the file must contain ONLY job title, key points
// and the job description/ideal profile — no company name, no salary — and
// plain text instead of raw HTML.
interface DownloadJobDescriptionProps {
    mandate: {
        title: string;
        description: string;
        key_requirements?: string[] | null;
    };
}

// ponytail: regex HTML→text keeps paragraph/list breaks, which
// DOMParser.textContent flattens. Display formatting only — sanitizing
// happens where HTML is rendered, not here. Exported for its test.
export function htmlToText(html: string): string {
    return html
        .replace(/<li[^>]*>/gi, "• ")
        .replace(/<\/(p|li|h[1-6]|ul|ol|div|tr)>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export function DownloadJobDescription({ mandate }: DownloadJobDescriptionProps) {
    const { t } = useTranslations();

    const handleDownload = () => {
        const keyPoints = (mandate.key_requirements ?? []).filter(Boolean);

        const content = [
            mandate.title,
            "=".repeat(mandate.title.length),
            "",
            ...(keyPoints.length > 0
                ? [
                    t("components.downloadJobKeyPointsLabel"),
                    "-".repeat(18),
                    ...keyPoints.map((p) => `• ${p}`),
                    "",
                ]
                : []),
            t("components.downloadJobDescriptionLabel"),
            "-".repeat(18),
            "",
            htmlToText(mandate.description),
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
            <Download className="h-3.5 w-3.5" /> {t("components.downloadJobDescriptionButton")}
        </Button>
    );
}
