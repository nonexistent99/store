import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Vento — marketplace digital",
  description: "Uma vitrine direta para produtos que acompanham seu ritmo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
