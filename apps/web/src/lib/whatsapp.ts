const CODIGO_DO_BRASIL = "55";

function numeroInternacional(numero: string): string | null {
  const digitos = numero.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `${CODIGO_DO_BRASIL}${digitos}`;
  if (digitos.length === 12 || digitos.length === 13) return digitos;
  return null;
}

export function linkDoWhatsApp(numero: string, mensagem: string): string | null {
  const internacional = numeroInternacional(numero);
  if (!internacional) return null;
  return `https://wa.me/${internacional}?text=${encodeURIComponent(mensagem)}`;
}
