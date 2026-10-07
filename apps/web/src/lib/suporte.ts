import { linkDoWhatsApp } from "@/lib/whatsapp";

function numeroDoSuporte(): string {
  return process.env.WHATSAPP_DO_SUPORTE ?? "";
}

export function linkDoSuporte(nome: string, assistencia: string): string | null {
  const mensagem = `Olá! Aqui é ${nome}, da ${assistencia}. Uso o Bancada e queria falar com vocês.`;
  return linkDoWhatsApp(numeroDoSuporte(), mensagem);
}

export function linkDoSuporteParaVisitantes(): string | null {
  return linkDoWhatsApp(
    numeroDoSuporte(),
    "Olá! Conheci o Bancada pelo site e queria tirar uma dúvida.",
  );
}
