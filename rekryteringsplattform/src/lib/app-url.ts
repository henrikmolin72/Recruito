import { headers } from "next/headers";

function stripTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export async function getAppUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const host = headerStore.get("host");

  if (forwardedHost) {
    const proto = forwardedProto || "https";
    return stripTrailingSlash(`${proto}://${forwardedHost}`);
  }

  if (host) {
    const proto = host.includes("localhost") ? "http" : "https";
    return stripTrailingSlash(`${proto}://${host}`);
  }

  if (envUrl) {
    return stripTrailingSlash(envUrl);
  }

  return "http://localhost:3000";
}
