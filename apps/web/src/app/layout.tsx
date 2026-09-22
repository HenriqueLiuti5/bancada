import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bancada",
  description: "Ordens de serviço para assistências técnicas de celular",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
