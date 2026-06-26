import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email/notification-email";
import sv from "@/i18n/dictionaries/sv.json";

type Params = Record<string, string | number | null | undefined>;

// Strip CRLF to defend against email-header / log injection from caller-supplied values.
function stripControl(s: string): string {
    return s.replace(/[\r\n\t\v\f]/g, " ").trim();
}

// Only allow same-origin paths; reject absolute or protocol-relative URLs.
function safePath(link: string | null | undefined): string | null {
    const v = link?.trim();
    if (!v) return null;
    if (!v.startsWith("/") || v.startsWith("//")) return null;
    return v;
}

// Resolve a dotted i18n key against the default-locale (sv) dictionary and
// interpolate {token} placeholders. This only produces the *stored fallback*
// text used by emails and legacy clients — the bell re-renders title/body in
// the viewer's own locale from title_key/body_key + params.
function renderTemplate(key: string | undefined, params?: Params): string {
    if (!key) return "";
    let value: any = sv;
    for (const part of key.split(".")) value = value?.[part];
    if (typeof value !== "string") return "";
    return value.replace(/\{(\w+)\}/g, (_, k) => {
        const v = params?.[k];
        return v == null ? "" : String(v);
    });
}

export type NotificationContent = {
    /** i18n key for the title (dotted path, e.g. "notif.newMessageTitle"). */
    titleKey?: string;
    /** i18n key for the body. */
    bodyKey?: string;
    /** Interpolation values for {token} placeholders in the keyed strings. */
    params?: Params;
    /** Raw, non-translatable title. Used only when titleKey is absent. */
    title?: string;
    /** Raw, non-translatable body (e.g. a chat message or a job title). Used only when bodyKey is absent. */
    body?: string;
    link?: string | null;
};

/**
 * Server-internal notification creator. NOT a server action — must only be
 * imported from server-side modules (server actions, route handlers, server
 * components). Kept out of any "use server" file so it isn't exposed as a
 * public RPC endpoint that a client could call to spam arbitrary userIds.
 *
 * Pass i18n keys (titleKey/bodyKey + params) so the bell can render each
 * notification in the recipient's chosen language. The stored title/body hold
 * a default-locale rendering for emails and pre-i18n clients.
 */
export async function createNotification(userId: string, content: NotificationContent) {
    const { titleKey, bodyKey } = content;

    // Sanitize string params up front so both the stored fallback and the
    // client-side re-render are injection-safe.
    const params: Params | undefined = content.params
        ? Object.fromEntries(
              Object.entries(content.params).map(([k, v]) => [k, typeof v === "string" ? stripControl(v) : v]),
          )
        : undefined;

    const fallbackTitle = stripControl(titleKey ? renderTemplate(titleKey, params) : (content.title ?? ""));
    const fallbackBody = (bodyKey ? renderTemplate(bodyKey, params) : (content.body ?? "")).trim();
    const normalizedLink = safePath(content.link);

    if (!fallbackTitle || !fallbackBody || !userId) return;

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        title: fallbackTitle,
        body: fallbackBody,
        title_key: titleKey ?? null,
        body_key: bodyKey ?? null,
        params: params ?? null,
        link: normalizedLink,
    });

    if (error) {
        console.error("Failed to create notification:", error);
        return;
    }

    // Schedule the email for after the response is sent. `after()` keeps the
    // function instance alive on Vercel/Fluid Compute past response close, so
    // the send isn't killed mid-flight (which `void` would do). Failures are
    // swallowed inside sendNotificationEmail so they never block the action.
    after(() => sendNotificationEmail(userId, fallbackTitle, fallbackBody, normalizedLink));
}
