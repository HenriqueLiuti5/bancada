import { ErroDaApi } from "@/lib/api";

const BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
const CINCO_MINUTOS = 300;

export type Oferta = { valor_mensal: string; dias_de_teste: number };

export async function buscarOferta(): Promise<Oferta> {
  const resposta = await fetch(`${BASE}/api/publico/oferta/`, {
    next: { revalidate: CINCO_MINUTOS },
  });
  if (!resposta.ok) throw new ErroDaApi(resposta.status, null);
  return (await resposta.json()) as Oferta;
}

export async function buscarOfertaSeDisponivel(): Promise<Oferta | null> {
  try {
    return await buscarOferta();
  } catch {
    return null;
  }
}

export function testeGratis(oferta: Oferta | null): string {
  return oferta ? `${oferta.dias_de_teste} dias grátis` : "Teste grátis";
}
