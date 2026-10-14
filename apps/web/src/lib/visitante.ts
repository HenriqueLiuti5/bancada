import { headers } from "next/headers";

export async function cabecalhoDoVisitante(): Promise<Record<string, string>> {
  const recebidos = await headers();
  const ultimoSalto = recebidos.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  const endereco = ultimoSalto || recebidos.get("x-real-ip");
  return endereco ? { "X-Forwarded-For": endereco } : {};
}
