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

  if (resposta.status === 401 && autenticado) redirect("/login");

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok) throw new ErroDaApi(resposta.status, dados);

  return dados as T;
}
