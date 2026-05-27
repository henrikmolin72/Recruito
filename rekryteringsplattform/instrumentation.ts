import * as Sentry from "@sentry/nextjs";

// Sentry is opt-in via SENTRY_DSN. Without a DSN configured, the SDK no-ops
// so local/dev builds and previews without secrets continue to work.

export async function register() {
    if (!process.env.SENTRY_DSN) return;

    if (process.env.NEXT_RUNTIME === "nodejs") {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
            // Full error capture, modest perf sampling. Tune down once volume is real.
            tracesSampleRate: 0.1,
            sendDefaultPii: false,
        });
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
            tracesSampleRate: 0.1,
            sendDefaultPii: false,
        });
    }
}

// Required for Next.js 15+ — surfaces server-side request errors to Sentry.
export const onRequestError = Sentry.captureRequestError;
