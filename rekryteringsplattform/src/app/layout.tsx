import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recruito — Skandinaviens rekryteringsmarknadsplats",
  description: "Koppla samman företag med de bästa frilansande rekryterarna i Skandinavien.",
};

import { Toaster } from "sonner";
import { Inter } from "next/font/google";
import { TopLoader } from "@/components/layout/top-loader";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv" className={inter.className}>
      <body className="antialiased font-sans">
        <Suspense fallback={null}>
          <TopLoader />
        </Suspense>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
