import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Rekryto - Rekryteringsmarknadsplats för Skandinavien",
  description:
    "Koppla samman rekryterande företag med frilansande rekryterare och headhunters i Skandinavien.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
