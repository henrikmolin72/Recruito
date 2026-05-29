-- Notifications: render-time localization.
-- Store a translation key + params alongside the rendered fallback text so the
-- bell can render each notification in the *viewer's* current language while
-- `title`/`body` keep a default-locale rendering for emails and legacy clients.
-- ALTER on an existing table — existing GRANTs apply, no new GRANT needed.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title_key TEXT,
  ADD COLUMN IF NOT EXISTS body_key  TEXT,
  ADD COLUMN IF NOT EXISTS params    JSONB;
