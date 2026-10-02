import { linkDoWhatsApp } from "@/lib/whatsapp";

export function linkDoSuporte(nome: string, assistencia: string): string | null {
  const mensagem = `Olá! Aqui é ${nome}, da ${assistencia}. Uso o Bancada e queria falar com vocês.`;
  return linkDoWhatsApp(process.env.WHATSAPP_DO_SUPORTE ?? "", mensagem);
}
