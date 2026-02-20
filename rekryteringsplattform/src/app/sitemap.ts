import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const routes = [
    { path: "/", priority: 1 },
    { path: "/login", priority: 0.8 },
    { path: "/register", priority: 0.8 },
    { path: "/register/company", priority: 0.7 },
    { path: "/register/recruiter", priority: 0.7 },
    { path: "/forgot-password", priority: 0.5 },
    { path: "/anvandarvillkor", priority: 0.4 },
    { path: "/integritetspolicy", priority: 0.4 },
    { path: "/gdpr", priority: 0.4 },
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: route.priority,
  }));
}
