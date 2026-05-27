import * as Sentry from "@sentry/nextjs";

// Client-side Sentry. Gated by NEXT_PUBLIC_SENTRY_DSN so deployments without
// the var simply ship the SDK as a no-op rather than throwing at load.
// Session replay is intentionally disabled here — it requires user consent
// (cookie-banner work lands in Sprint A Day 2).

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
        // Replay disabled until consent flow exists.
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
    });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
