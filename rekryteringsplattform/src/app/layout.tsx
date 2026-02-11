import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { getLocale } from "@/lib/i18n/locale";

export const metadata: Metadata = {
  title: "Rekryto - Rekryteringsmarknadsplats för Skandinavien",
  description:
    "Koppla samman rekryterande företag med frilansande rekryterare och headhunters i Skandinavien.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
