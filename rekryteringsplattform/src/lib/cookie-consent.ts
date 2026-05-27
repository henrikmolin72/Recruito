"use client";

// Cookie-based consent state. Cookie value is a JSON object so we can extend
// categories without invalidating older grants (bump CONSENT_VERSION when an
// existing category's meaning changes, which forces a re-prompt).
//
// Why not localStorage: cookies are sent on the SSR request, so a future
// server-side gate can read consent without an extra round-trip.

export const CONSENT_COOKIE = "recruito_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_UPDATED_EVENT = "recruito:consent-updated";

export type ConsentState = {
    version: number;
    necessary: true; // always granted; included for shape stability
    analytics: boolean;
    ts: string;
};

function readCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const prefix = `${name}=`;
    for (const part of document.cookie.split("; ")) {
        if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length));
    }
    return null;
}

function writeCookie(name: string, value: string) {
    if (typeof document === "undefined") return;
    const oneYearSeconds = 60 * 60 * 24 * 365;
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    const parts = [
        `${name}=${encodeURIComponent(value)}`,
        "Path=/",
        `Max-Age=${oneYearSeconds}`,
        "SameSite=Lax",
    ];
    if (isHttps) parts.push("Secure");
    document.cookie = parts.join("; ");
}

export function getConsent(): ConsentState | null {
    const raw = readCookie(CONSENT_COOKIE);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<ConsentState>;
        if (parsed.version !== CONSENT_VERSION) return null;
        return {
            version: CONSENT_VERSION,
            necessary: true,
            analytics: Boolean(parsed.analytics),
            ts: typeof parsed.ts === "string" ? parsed.ts : new Date().toISOString(),
        };
    } catch {
        return null;
    }
}

export function setConsent(input: { analytics: boolean }): ConsentState {
    const state: ConsentState = {
        version: CONSENT_VERSION,
        necessary: true,
        analytics: input.analytics,
        ts: new Date().toISOString(),
    };
    writeCookie(CONSENT_COOKIE, JSON.stringify(state));
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(CONSENT_UPDATED_EVENT, { detail: state }));
    }
    return state;
}

export function hasAnalyticsConsent(): boolean {
    return getConsent()?.analytics === true;
}
