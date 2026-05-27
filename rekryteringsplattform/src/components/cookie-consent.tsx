"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/i18n/client";
import { getConsent, setConsent } from "@/lib/cookie-consent";

export function CookieConsentBanner() {
    const { t } = useTranslations();
    const [visible, setVisible] = useState(false);
    const [customizing, setCustomizing] = useState(false);
    const [analyticsChoice, setAnalyticsChoice] = useState(false);

    useEffect(() => {
        // Render only after mount so SSR HTML is consent-agnostic.
        if (!getConsent()) setVisible(true);
    }, []);

    if (!visible) return null;

    function acceptAll() {
        setConsent({ analytics: true });
        setVisible(false);
    }

    function rejectNonEssential() {
        setConsent({ analytics: false });
        setVisible(false);
    }

    function saveCustom() {
        setConsent({ analytics: analyticsChoice });
        setVisible(false);
    }

    return (
        <div
            role="dialog"
            aria-modal="false"
            aria-labelledby="cookie-consent-title"
            className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white shadow-lg"
        >
            <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
                <h2 id="cookie-consent-title" className="text-sm font-semibold text-gray-900">
                    {t("cookieConsent.title")}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                    {t("cookieConsent.description")}{" "}
                    <Link href="/integritetspolicy" className="underline hover:text-gray-900">
                        {t("cookieConsent.privacyLink")}
                    </Link>
                </p>

                {customizing && (
                    <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                        <label className="flex items-start gap-2 opacity-70">
                            <input type="checkbox" checked disabled className="mt-1" />
                            <div>
                                <div className="text-sm font-medium text-gray-900">
                                    {t("cookieConsent.necessaryTitle")}
                                </div>
                                <div className="text-xs text-gray-600">
                                    {t("cookieConsent.necessaryDescription")}
                                </div>
                            </div>
                        </label>
                        <label className="mt-3 flex items-start gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={analyticsChoice}
                                onChange={(e) => setAnalyticsChoice(e.target.checked)}
                                className="mt-1"
                            />
                            <div>
                                <div className="text-sm font-medium text-gray-900">
                                    {t("cookieConsent.analyticsTitle")}
                                </div>
                                <div className="text-xs text-gray-600">
                                    {t("cookieConsent.analyticsDescription")}
                                </div>
                            </div>
                        </label>
                    </div>
                )}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    {!customizing && (
                        <button
                            type="button"
                            onClick={() => setCustomizing(true)}
                            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            {t("cookieConsent.customize")}
                        </button>
                    )}
                    {customizing ? (
                        <button
                            type="button"
                            onClick={saveCustom}
                            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            {t("cookieConsent.save")}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={rejectNonEssential}
                            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            {t("cookieConsent.rejectNonEssential")}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={acceptAll}
                        className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        {t("cookieConsent.acceptAll")}
                    </button>
                </div>
            </div>
        </div>
    );
}
