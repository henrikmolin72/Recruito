import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rekryto — Skandinaviens rekryteringsmarknadsplats",
  description: "Koppla samman företag med de bästa frilansande rekryterarna i Skandinavien.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body className="antialiased">{children}</body>
    </html>
  );
}
