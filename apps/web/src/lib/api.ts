import { redirect } from "next/navigation";
import { lerToken } from "@/lib/sessao";

const BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

export class ErroDaApi extends Error {
  constructor(
    readonly status: number,
    readonly corpo: unknown,
  ) {
    super(`API respondeu ${status}`);
  }
}

type Opcoes = { metodo?: string; corpo?: unknown; autenticado?: boolean };

async function interpretar<T>(resposta: Response, autenticado: boolean): Promise<T> {
  if (resposta.status === 401 && autenticado) redirect("/login");

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok) throw new ErroDaApi(resposta.status, dados);

  return dados as T;
}

export function mensagemDaApi(erro: unknown, alternativa: string): string {
  if (!(erro instanceof ErroDaApi)) return "Não foi possível falar com o servidor.";

  const corpo = erro.corpo as Record<string, unknown> | null;
  if (typeof corpo?.detail === "string") return corpo.detail;

  const primeira = corpo ? Object.values(corpo)[0] : null;
  if (typeof primeira === "string") return primeira;
  if (Array.isArray(primeira) && typeof primeira[0] === "string") return primeira[0];

  return alternativa;
}

export async function chamarApi<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { metodo = "GET", corpo, autenticado = true } = opcoes;
  const cabecalhos: Record<string, string> = { "Content-Type": "application/json" };

  if (autenticado) {
    const token = await lerToken();
    if (!token) redirect("/login");
    cabecalhos.Authorization = `Token ${token}`;
  }

  const resposta = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    cache: "no-store",
  });

  return interpretar<T>(resposta, autenticado);
}

export async function enviarArquivo<T>(caminho: string, dados: FormData): Promise<T> {
  const token = await lerToken();
  if (!token) redirect("/login");

  const resposta = await fetch(`${BASE}${caminho}`, {
    method: "POST",
    headers: { Authorization: `Token ${token}` },
    body: dados,
    cache: "no-store",
  });

  return interpretar<T>(resposta, true);
}
