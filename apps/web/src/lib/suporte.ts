const CODIGO_DO_BRASIL = "55";

function numeroDoSuporte(): string | null {
  const digitos = (process.env.WHATSAPP_DO_SUPORTE ?? "").replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `${CODIGO_DO_BRASIL}${digitos}`;
  if (digitos.length === 12 || digitos.length === 13) return digitos;
  return null;
}

export function linkDoSuporte(nome: string, assistencia: string): string | null {
  const numero = numeroDoSuporte();
  if (!numero) return null;

  const mensagem = `Olá! Aqui é ${nome}, da ${assistencia}. Uso o Bancada e queria falar com vocês.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
