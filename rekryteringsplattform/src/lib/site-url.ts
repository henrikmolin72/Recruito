function stripTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!raw) {
    return "http://localhost:3000";
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return stripTrailingSlash(raw);
  }

  return stripTrailingSlash(`https://${raw}`);
}
