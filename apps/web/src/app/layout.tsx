import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { COOKIE_DO_TEMA, lerTema } from "@/lib/tema";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: "Bancada",
  description: "Ordens de serviço para assistências técnicas de celular",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const tema = lerTema((await cookies()).get(COOKIE_DO_TEMA)?.value);

  return (
    <html lang="pt-BR" data-tema={tema} className={jakarta.variable}>
      <body className="min-h-screen bg-fundo text-texto">{children}</body>
    </html>
  );
}
