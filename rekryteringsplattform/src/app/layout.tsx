import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Inter } from "next/font/google";
import { TopLoader } from "@/components/layout/top-loader";
import { Suspense } from "react";
import { getLocale, getDictionary } from "@/i18n/server";
import { LocaleProvider } from "@/i18n/client";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: `Recruito — ${dict.landing.heroTitleLine2}`,
    description: dict.landing.heroDescription,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Recruito",
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dictionary = await getDictionary();

  return (
    <html lang={locale} className={inter.className}>
      <head>
        <meta name="theme-color" content="#1e40af" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="antialiased font-sans">
        <Suspense fallback={null}>
          <TopLoader />
        </Suspense>
        <LocaleProvider locale={locale} dictionary={dictionary as Record<string, Record<string, string>>}>
          {children}
        </LocaleProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
