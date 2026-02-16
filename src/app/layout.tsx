import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rekryto — Rekryteringsmarknadsplatsen för Skandinavien",
  description:
    "Koppla samman företag med de bästa frilansande rekryterarna. Betala bara vid lyckad anställning.",
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
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
