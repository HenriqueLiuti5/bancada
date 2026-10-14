import { linkDoWhatsApp } from "@/lib/whatsapp";

const MENSAGEM_DE_QUEM_VISITA = "Olá! Conheci o Bancada pelo site e queria tirar uma dúvida.";

function numeroDoSuporte(): string {
  return process.env.WHATSAPP_DO_SUPORTE ?? "";
}

export function linkDoSuporte(nome: string, assistencia: string): string | null {
  const mensagem = `Olá! Aqui é ${nome}, da ${assistencia}. Uso o Bancada e queria falar com vocês.`;
  return linkDoWhatsApp(numeroDoSuporte(), mensagem);
}

export function linkDoSuporteParaVisitantes(mensagem = MENSAGEM_DE_QUEM_VISITA): string | null {
  return linkDoWhatsApp(numeroDoSuporte(), mensagem);
}
