# 2026-09-04 — Presence tracking via presence_sessions (no cron, no realtime)

**Context.** Client ask (image 02-09-03): admin header shows "Recruiters online | Companies online", clickable → history of both. Nothing existed.

**Decision.** One service-role-only table `presence_sessions` (migration 080): one row per user session. The dashboard layout mounts a 60 s heartbeat (`touchPresence`, only while the tab is visible) that extends the latest row or starts a new one after a 15-minute gap. Online = `last_seen_at` within 5 minutes. History = distinct users per role per Stockholm day for 30 days, aggregated in TypeScript (`src/lib/presence.ts`, unit-tested). Admins are never recorded.

**Rejected.** (a) `profiles.last_seen_at` column — would expose last-seen to every authenticated user through the broad profiles SELECT policy. (b) Cron-written snapshots — adds a Vercel cron dependency for numbers that are cheap to derive on read. (c) Supabase Realtime presence — ephemeral, no history.

**Ceilings.** ~1 server-action call per user per minute; ≤ a few sessions per user per day. Add hourly concurrency buckets or a retention job only if asked. Sessions are personal data: `ON DELETE CASCADE` covers deletion; add them to the data-rights export when that surface is next touched.
