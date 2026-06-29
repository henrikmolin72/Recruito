# Notifications & Email — As-Built (2026-06-29, migrations through 061)
> Current-state companion to the original build spec [[Architecture/08-NOTIFICATIONS]]. The spec is the frozen April plan; this note is what the code actually does now.

## What it does today

Two coupled channels, both fired from inside server actions / route handlers — there is no dedicated notification queue or worker.

- **In-app bell.** `createNotification(userId, content)` inserts a row into `public.notifications` via the **admin (service-role)** client. It is `server-only`, deliberately NOT a `"use server"` action, so the client can't call it to spam arbitrary `userId`s (see the docstring in `create.ts`).
- **i18n at render time.** Each notification stores both a rendered `title`/`body` (default-locale `sv`, for emails/legacy clients) AND a `title_key`/`body_key` + `params` JSON. The bell (`notifications-dropdown.tsx`) re-renders title/body in the **viewer's** current locale via `t(title_key)` + `{token}` interpolation; it falls back to the stored `title`/`body` when no key is present.
- **Email shadow.** Right after the insert, `create.ts` schedules `sendNotificationEmail(...)` inside Next's `after()` (keeps the function alive on Fluid Compute past response close — a bare `void` would be killed mid-send). The email send is best-effort and fully swallowed; it never blocks the triggering action.
- **Per-user opt-out.** `sendNotificationEmail` reads `profiles.email + email_opt_out`; a `null` email or `email_opt_out = true` short-circuits the send. There is no per-category preference — opt-out is all-or-nothing.
- **Bell read state.** `getNotifications` returns the latest 20 for the authed user; `markAsRead`/`markAllAsRead` are auth-scoped (`.eq("user_id", user.id)`). No unread-count endpoint — count is derived client-side.
- **Admin fan-out.** `notifyAdmins(content)` looks up all `profiles.role = 'admin'` with the admin client and calls `createNotification` per admin, so process events (job closed/paused, fee approve/reject, breach reported, etc.) reach admins who aren't flow participants. Best-effort; failures logged and swallowed.
- **Provider pipeline.** `dispatch()` in `internal-notifications.ts` prefers **Resend** (`RESEND_API_KEY`), falls back to **Nodemailer SMTP** (`SMTP_*`) if Resend errors, and logs-and-skips if neither is configured. Two public senders ride it: `sendUserEmail` (branded user mail) and `sendInternalRecruiterEmail` (to `INTERNAL_REVIEW_EMAIL`, skips if unset).
- **Injection hardening.** String `params` are CRLF-stripped (`stripControl`) before storage; subjects are CRLF-stripped (`sanitizeSubject`); all email bodies HTML-escape interpolated values; links are forced same-origin (`safePath` rejects absolute/`//` URLs) in both the stored link and the email CTA.

## Key files

- `src/lib/actions/notifications.ts` — the only `"use server"` file here: `getNotifications` / `markAsRead` / `markAllAsRead` (bell read path, auth-scoped).
- `src/lib/notifications/create.ts` — `createNotification`; sanitization, `sv` fallback rendering, insert, `after()` email schedule. Load-bearing.
- `src/lib/notifications/notify-admins.ts` — `notifyAdmins`; fan-out to all admins.
- `src/lib/notifications/notify-admins.test.ts` — covers the fan-out.
- `src/lib/email/internal-notifications.ts` — `dispatch()` Resend→SMTP pipeline; `sendUserEmail`, `sendInternalRecruiterEmail`.
- `src/lib/email/notification-email.ts` — `sendNotificationEmail`; opt-out lookup + branded HTML/text template for bell-mirrored mail.
- `src/lib/email/email-templates.ts` — standalone HTML templates for specific events: new-job, candidate-submission, candidate-progress, `jobLifecycleEmail` (paused/reopened/closed), `paymentCompletedEmail`, `feeReconfirmEmail`.
- `src/components/layout/notifications-dropdown.tsx` — the bell UI; renders `title_key`/`body_key` in the viewer's locale, falls back to stored text.
- Callers of these helpers: `actions/{jobs,candidates,recruiter,admin,messages,admin-messages,placements}.ts`, `lib/{job-fill,mandate-expiry-release}.ts`, and the `api/guarantee/{breach,breach/review,reminders}` routes.

## Data model / migrations

- `public.notifications` — pre-existing table (created before 037). Holds `user_id, title, body, link, is_read, created_at`.
  - **037** `037_email_preferences.sql` — adds `profiles.email_opt_out BOOLEAN NOT NULL DEFAULT FALSE` (the email kill-switch read by `sendNotificationEmail`).
  - **041** `041_notification_i18n.sql` — adds `notifications.title_key`, `body_key` (TEXT) and `params` (JSONB) for render-time localization. `ALTER` only, no new GRANT.
  - **042** `042_mandate_expiry_notified.sql` — adds `job_mandates.mandate_expiry_notified_at TIMESTAMPTZ`; the mandate-expiry cron stamps it so the "mandate expired" heads-up fires exactly once and the cron stays idempotent. `ALTER` only, no new GRANT.
- i18n keys live under the `notif.*` namespace in `src/i18n/dictionaries/*.json` (e.g. `notif.adminJobClosedTitle/Body`, `notif.guaranteeBreachApprovedTitle`, `notif.guaranteeExpiring14Body`). Per the project i18n guardrail, new keys must exist in every locale dictionary (en/sv/da/no) or the build fails.

## Notable changes since the original plan

- **Localized notifications** — the April plan stored only rendered text. Migration 041 + the bell's key-based re-render mean the same row now displays in each viewer's own locale; stored `title`/`body` are now just the email/legacy fallback.
- **Email is opt-out + best-effort + deferred** — bell-mirrored email now rides Next `after()` and a per-user `email_opt_out` flag (037), decoupled from the action's success path.
- **Dual-provider dispatch** — Resend primary with SMTP fallback (and a log-and-skip no-provider mode), rather than a single hardcoded transport.
- **Security pass** — CRLF/header-injection stripping, HTML escaping, and same-origin link enforcement are now applied centrally in `create.ts` and the email layer.
- **Admin fan-out helper** — `notifyAdmins` did not exist in the original area; added so lifecycle/guarantee events reach admins.
- **Mandate-expiry dedupe** — the expiry cron is now idempotent via `mandate_expiry_notified_at` (042), tied into the broader release/recycle work in [[Decisions/2026-06-01-mandate-expiry-recycle]].

## Not yet live (caveat)

An **email-suppression webhook** (Resend bounce/complaint) plus an `email_suppressions` table and a pre-send suppression check in `dispatch()` were **built on a branch but are NOT deployed**: migration **062** is absent from `supabase/migrations/` (latest present is 060), there is no `email_suppressions` reference anywhere in `src/`, no Resend webhook route exists, and `dispatch()` performs no suppression lookup. Treat suppression as **not in production** as of 2026-06-29. Do not assume bounced/complained addresses are being filtered.

## Related decisions & notes

- [[Decisions/2026-06-01-mandate-expiry-recycle]] — context for the mandate-expiry cron that owns `mandate_expiry_notified_at` (migration 042).
- [[Decisions/2026-06-22-i18n-dashboard-sweep]] — the i18n conventions (`t(key)`, param interpolation via `.replace`, all 4 locales) that the bell's `title_key`/`body_key` rendering follows.
- [[Dev-Notes/migration-grant-snippet]] — GRANT policy for new `public.*` tables (relevant if/when migration 062 / `email_suppressions` lands).
- Cross-area: messaging notifications are emitted from `actions/messages.ts` / `actions/admin-messages.ts` — see [[Architecture/As-Built/07-MESSAGING]] if present.
