import { headers } from "next/headers";
import { cabecalhoDoVisitante } from "@/lib/visitante";

// O Umami fica na rede interna do servidor, e o navegador fala só com o Next (ADR 0039).
const TEMPO_MAXIMO_EM_MS = 3000;

// O script continua na página quando a pessoa entra no sistema sem recarregar, e conta cada troca
// de tela; o que não for destas páginas para aqui, antes de chegar ao Umami.
export const PAGINAS_CONTADAS = ["/", "/demonstracao", "/cadastro", "/login", "/termos", "/privacidade"];

export function paginaContada(endereco: unknown): boolean {
  if (typeof endereco !== "string") return false;
  try {
    return PAGINAS_CONTADAS.includes(new URL(endereco, "http://bancada").pathname);
  } catch {
    return false;
  }
}

export function idDoSite(): string | null {
  return process.env.UMAMI_ID_DO_SITE || null;
}

function enderecoDoUmami(): string | null {
  return process.env.UMAMI_URL_INTERNA?.replace(/\/$/, "") || null;
}

export function estatisticasLigadas(): boolean {
  return Boolean(idDoSite() && enderecoDoUmami());
}

export async function cabecalhosDoVisitante(): Promise<Record<string, string>> {
  const recebidos = await headers();
  const navegador = recebidos.get("user-agent");
  return { ...(await cabecalhoDoVisitante()), ...(navegador ? { "User-Agent": navegador } : {}) };
}

export async function levarAoUmami(caminho: string, pedido: RequestInit): Promise<Response | null> {
  const umami = enderecoDoUmami();
  if (!umami || !idDoSite()) return null;
  try {
    return await fetch(`${umami}${caminho}`, {
      ...pedido,
      cache: "no-store",
      signal: AbortSignal.timeout(TEMPO_MAXIMO_EM_MS),
    });
  } catch {
    return null;
  }
}

export function eventoDeCadastro(site: string, enderecoPublico: string | undefined) {
  const hostname = enderecoPublico ? new URL(enderecoPublico).hostname : undefined;
  return { type: "event", payload: { website: site, hostname, url: "/cadastro", name: "cadastro" } };
}

// O Umami liga o cadastro à visita pelo IP e pelo navegador de quem se cadastrou.
export async function contarCadastro(cabecalhos: Record<string, string>): Promise<void> {
  const site = idDoSite();
  if (!site) return;
  await levarAoUmami("/api/send", {
    method: "POST",
    headers: { ...cabecalhos, "Content-Type": "application/json" },
    body: JSON.stringify(eventoDeCadastro(site, process.env.APP_PUBLIC_URL)),
  });
}
