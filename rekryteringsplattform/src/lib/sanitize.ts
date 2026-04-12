import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = ["p", "strong", "em", "b", "i", "ul", "ol", "li", "br", "h1", "h2", "h3", "h4"];

/**
 * Sanitize HTML from the rich text editor before rendering.
 * Strips all attributes and only allows safe formatting tags.
 */
export function sanitizeRichText(html: string): string {
    return sanitizeHtml(html, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: {},
    });
}

/**
 * Strip all HTML tags and return plain text.
 * Used for AI prompts and other non-HTML contexts.
 */
export function stripHtml(html: string): string {
    return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
        .replace(/\s+/g, " ")
        .trim();
}
