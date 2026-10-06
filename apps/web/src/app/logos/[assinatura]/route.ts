import { repassarImagem } from "@/lib/repasse";

type Contexto = { params: Promise<{ assinatura: string }> };

export async function GET(_pedido: Request, contexto: Contexto): Promise<Response> {
  const { assinatura } = await contexto.params;
  return repassarImagem(`/api/logos/arquivo/${encodeURIComponent(assinatura)}/`, "image/png");
}
