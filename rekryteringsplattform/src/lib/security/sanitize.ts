// Strip HTML tags to prevent XSS in user-submitted content
export function sanitizeHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").replace(/[<>]/g, "");
}

// Sanitize a full object's string fields recursively
export function sanitizeInput<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === "string") {
      (result as any)[key] = sanitizeHtml(value);
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      (result as any)[key] = sanitizeInput(value as Record<string, unknown>);
    }
  }
  return result;
}

// Validate UUID format to prevent injection
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
}
