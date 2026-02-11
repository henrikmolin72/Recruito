import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rekryto - Rekryteringsmarknadsplats för Skandinavien",
  description:
    "Koppla samman företag med frilansande rekryterare och headhunters i Skandinavien.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className="antialiased">{children}</body>
    </html>
  );
}
